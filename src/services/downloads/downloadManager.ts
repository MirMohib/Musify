/**
 * Offline download manager built on expo-file-system's DownloadTask (with native pause/resume)
 * and SQLite metadata persistence.
 * - Enforces provider download permission (isTrackDownloadable) and storage limits.
 * - Preserves audio extensions (.m4a, .mp3, .ogg, .wav, etc.) via URL & MIME type inspection.
 * - Caches track cover artwork locally for full offline rendering.
 */

import { Directory, DownloadTask, File, Paths } from 'expo-file-system';

import { getProvider, isTrackDownloadable } from '@/services/sources/sourceRegistry';
import {
  deleteDownloadDb,
  upsertDownloadDb,
  upsertTrack,
} from '@/services/storage/database';
import type { AppSettings, DownloadRecord, Track } from '@/types/music';

const DOWNLOADS_DIR_NAME = 'musify_downloads';
const ARTWORK_DIR_NAME = 'musify_artwork';

type ProgressCallback = (record: DownloadRecord) => void;

const activeTasks = new Map<string, DownloadTask>();

function getDownloadDirectory(location: AppSettings['downloadLocation']): Directory {
  const base = location === 'cache' ? Paths.cache : Paths.document;
  const dir = new Directory(base, DOWNLOADS_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function getArtworkDirectory(location: AppSettings['downloadLocation']): Directory {
  const base = location === 'cache' ? Paths.cache : Paths.document;
  const dir = new Directory(base, ARTWORK_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function sanitizeSlug(track: Track): string {
  return `${track.sourceId}_${track.sourceTrackId}_${track.title}`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64);
}

const KNOWN_AUDIO_EXTS = ['.m4a', '.mp4', '.mp3', '.ogg', '.opus', '.wav', '.flac', '.aac'] as const;

export function inferAudioExtensionFromUrlOrMime(url: string, contentType?: string | null): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    for (const ext of KNOWN_AUDIO_EXTS) {
      if (pathname.endsWith(ext)) {
        return ext === '.mp4' ? '.m4a' : ext;
      }
    }
    const queryMime = (parsed.searchParams.get('mime') ?? '').toLowerCase();
    if (queryMime.includes('mp4') || queryMime.includes('m4a')) return '.m4a';
    if (queryMime.includes('webm') || queryMime.includes('opus')) return '.ogg';
  } catch {
    const lower = url.split('?')[0].toLowerCase();
    for (const ext of KNOWN_AUDIO_EXTS) {
      if (lower.endsWith(ext)) {
        return ext === '.mp4' ? '.m4a' : ext;
      }
    }
  }

  const mime = (contentType ?? '').toLowerCase().split(';')[0].trim();
  if (mime === 'audio/mp4' || mime === 'audio/x-m4a' || mime === 'audio/m4a') return '.m4a';
  if (mime === 'audio/ogg' || mime === 'application/ogg' || mime === 'audio/opus') return '.ogg';
  if (mime === 'audio/wav' || mime === 'audio/x-wav' || mime === 'audio/wave') return '.wav';
  if (mime === 'audio/flac' || mime === 'audio/x-flac') return '.flac';
  if (mime === 'audio/aac' || mime === 'audio/x-aac') return '.aac';
  if (mime === 'audio/mpeg' || mime === 'audio/mp3') return '.mp3';

  return '.mp3';
}

async function detectAudioExtension(url: string): Promise<string> {
  const fromUrl = inferAudioExtensionFromUrlOrMime(url);
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (KNOWN_AUDIO_EXTS.some((ext) => pathname.endsWith(ext))) {
      return fromUrl;
    }
  } catch {
    // proceed to HEAD probe
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      return inferAudioExtensionFromUrlOrMime(url, res.headers.get('content-type'));
    }
  } catch {
    // Fallback cleanly to default .mp3 if HEAD is blocked or times out
  }

  return fromUrl;
}

async function cacheTrackArtwork(
  track: Track,
  location: AppSettings['downloadLocation']
): Promise<string | undefined> {
  if (track.localArtworkUri) {
    try {
      const existing = new File(track.localArtworkUri);
      if (existing.exists) return track.localArtworkUri;
    } catch {
      // re-download below
    }
  }
  if (!track.artworkUrl) return undefined;

  try {
    const dir = getArtworkDirectory(location);
    const lowerUrl = track.artworkUrl.split('?')[0].toLowerCase();
    const ext = lowerUrl.endsWith('.png') ? '.png' : lowerUrl.endsWith('.webp') ? '.webp' : '.jpg';
    const artFile = new File(dir, `${sanitizeSlug(track)}${ext}`);
    try {
      if (artFile.exists) artFile.delete();
    } catch {
      // ignore
    }
    const artTask = new DownloadTask(track.artworkUrl, artFile);
    const saved = await artTask.downloadAsync();
    return saved?.uri ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Native Expo Modules Int64 values (file.size, bytesWritten, totalBytes)
 * can arrive as JS `bigint` at runtime; convert explicitly before arithmetic or SQLite writes.
 */
export function toSafeNumber(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getDownloadedStorageBytes(records: Record<string, DownloadRecord>): number {
  let total = 0;
  for (const rec of Object.values(records)) {
    if (rec.status === 'completed' && rec.localUri) {
      try {
        const f = new File(rec.localUri);
        if (f.exists) {
          total += toSafeNumber(f.size) || toSafeNumber(rec.bytesWritten) || toSafeNumber(rec.totalBytes);
        }
      } catch {
        total += toSafeNumber(rec.bytesWritten) || toSafeNumber(rec.totalBytes);
      }
    }
  }
  return total;
}

export async function startTrackDownload(
  track: Track,
  settings: AppSettings,
  currentDownloads: Record<string, DownloadRecord>,
  onUpdate: ProgressCallback
): Promise<DownloadRecord> {
  if (!isTrackDownloadable(track)) {
    throw new Error(`"${track.title}" cannot be downloaded per source licensing.`);
  }

  const usedMb = getDownloadedStorageBytes(currentDownloads) / (1024 * 1024);
  if (usedMb >= settings.maxDownloadStorageMb) {
    throw new Error(
      `Download storage limit (${settings.maxDownloadStorageMb} MB) reached. Free up space in Downloads or Settings.`
    );
  }

  let downloadUrl = track.streamUrl;
  if (!downloadUrl) {
    const provider = getProvider(track.sourceId);
    if (provider) {
      downloadUrl = (await provider.getStreamUrl(track, settings.downloadQuality)) ?? undefined;
    }
  }
  if (!downloadUrl) {
    throw new Error(`No downloadable audio URL available for "${track.title}".`);
  }

  const [ext, localArtworkUri] = await Promise.all([
    detectAudioExtension(downloadUrl),
    cacheTrackArtwork(track, settings.downloadLocation),
  ]);

  const trackWithOfflineArt: Track = localArtworkUri
    ? { ...track, localArtworkUri }
    : track;

  await upsertTrack(trackWithOfflineArt);

  const dir = getDownloadDirectory(settings.downloadLocation);
  const destFile = new File(dir, `${sanitizeSlug(track)}${ext}`);
  try {
    if (destFile.exists) {
      destFile.delete();
    }
  } catch {
    // ignore
  }
  const now = Date.now();

  let record: DownloadRecord = {
    trackId: track.id,
    status: 'downloading',
    progress: 0,
    bytesWritten: 0,
    totalBytes: 0,
    localArtworkUri,
    createdAt: currentDownloads[track.id]?.createdAt ?? now,
    updatedAt: now,
  };
  await upsertDownloadDb(record);
  onUpdate(record);

  let lastPersistedProgress = 0;
  const task = new DownloadTask(downloadUrl, destFile, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      const safeWritten = toSafeNumber(bytesWritten);
      const safeTotal = toSafeNumber(totalBytes);
      const progress = safeTotal > 0 ? Math.min(1, safeWritten / safeTotal) : 0;
      record = {
        ...record,
        status: 'downloading',
        bytesWritten: safeWritten,
        totalBytes: safeTotal,
        progress,
        updatedAt: Date.now(),
      };
      onUpdate(record);
      if (progress - lastPersistedProgress >= 0.1) {
        lastPersistedProgress = progress;
        upsertDownloadDb(record).catch(() => {});
      }
    },
  });

  activeTasks.set(track.id, task);

  try {
    const completedFile = await task.downloadAsync();
    if (completedFile) {
      const finalBytes = toSafeNumber(completedFile.size) || record.bytesWritten;
      record = {
        ...record,
        status: 'completed',
        progress: 1,
        bytesWritten: finalBytes,
        totalBytes: record.totalBytes || finalBytes,
        localUri: completedFile.uri,
        localArtworkUri,
        resumeStateJson: undefined,
        error: undefined,
        updatedAt: Date.now(),
      };
      await upsertDownloadDb(record);
      await upsertTrack({ ...trackWithOfflineArt, localUri: completedFile.uri });
      onUpdate(record);
      return record;
    }

    const savable = task.savable();
    record = {
      ...record,
      status: 'paused',
      resumeStateJson: JSON.stringify(savable),
      updatedAt: Date.now(),
    };
    await upsertDownloadDb(record);
    onUpdate(record);
    return record;
  } catch (err) {
    if (task.state === 'cancelled') {
      record = {
        ...record,
        status: 'cancelled',
        updatedAt: Date.now(),
      };
      await deleteDownloadDb(track.id);
      onUpdate(record);
      return record;
    }

    record = {
      ...record,
      status: 'error',
      error: err instanceof Error ? err.message : 'Download failed',
      updatedAt: Date.now(),
    };
    await upsertDownloadDb(record);
    onUpdate(record);
    throw err;
  } finally {
    if (task.state !== 'paused') {
      activeTasks.delete(track.id);
      try {
        task.release();
      } catch {
        // ignore
      }
    }
  }
}

export async function pauseTrackDownload(
  trackId: string,
  currentRecord: DownloadRecord | undefined,
  onUpdate: ProgressCallback
): Promise<void> {
  const task = activeTasks.get(trackId);
  if (!task || task.state !== 'active') return;
  await task.pauseAsync();
  const savable = task.savable();
  const updated: DownloadRecord = {
    ...(currentRecord ?? {
      trackId,
      progress: 0,
      bytesWritten: 0,
      totalBytes: 0,
      createdAt: Date.now(),
    }),
    status: 'paused',
    resumeStateJson: JSON.stringify(savable),
    updatedAt: Date.now(),
  };
  await upsertDownloadDb(updated);
  onUpdate(updated);
}

export async function resumeTrackDownload(
  track: Track,
  settings: AppSettings,
  currentRecord: DownloadRecord,
  currentDownloads: Record<string, DownloadRecord>,
  onUpdate: ProgressCallback
): Promise<void> {
  let task = activeTasks.get(track.id);

  if (!task && currentRecord.resumeStateJson) {
    try {
      const savable = JSON.parse(currentRecord.resumeStateJson);
      task = DownloadTask.fromSavable(savable, {
        onProgress: ({ bytesWritten, totalBytes }) => {
          const safeWritten = toSafeNumber(bytesWritten);
          const safeTotal = toSafeNumber(totalBytes);
          const progress = safeTotal > 0 ? Math.min(1, safeWritten / safeTotal) : 0;
          const next: DownloadRecord = {
            ...currentRecord,
            status: 'downloading',
            bytesWritten: safeWritten,
            totalBytes: safeTotal,
            progress,
            updatedAt: Date.now(),
          };
          onUpdate(next);
        },
      });
      activeTasks.set(track.id, task);
    } catch {
      task = undefined;
    }
  }

  if (!task || task.state !== 'paused') {
    await startTrackDownload(track, settings, currentDownloads, onUpdate);
    return;
  }

  const activeRec: DownloadRecord = {
    ...currentRecord,
    status: 'downloading',
    updatedAt: Date.now(),
  };
  await upsertDownloadDb(activeRec);
  onUpdate(activeRec);

  try {
    const file = await task.resumeAsync();
    if (file) {
      const finalBytes = toSafeNumber(file.size) || activeRec.bytesWritten;
      const done: DownloadRecord = {
        ...activeRec,
        status: 'completed',
        progress: 1,
        bytesWritten: finalBytes,
        totalBytes: activeRec.totalBytes || finalBytes,
        localUri: file.uri,
        resumeStateJson: undefined,
        error: undefined,
        updatedAt: Date.now(),
      };
      await upsertDownloadDb(done);
      await upsertTrack({
        ...track,
        localUri: file.uri,
        localArtworkUri: activeRec.localArtworkUri ?? track.localArtworkUri,
      });
      onUpdate(done);
    }
  } catch (err) {
    const errored: DownloadRecord = {
      ...activeRec,
      status: 'error',
      error: err instanceof Error ? err.message : 'Resume failed',
      updatedAt: Date.now(),
    };
    await upsertDownloadDb(errored);
    onUpdate(errored);
  } finally {
    if (task.state !== 'paused') {
      activeTasks.delete(track.id);
    }
  }
}

export async function removeTrackDownload(
  trackId: string,
  record?: DownloadRecord
): Promise<void> {
  const task = activeTasks.get(trackId);
  if (task) {
    try {
      task.cancel();
      task.release();
    } catch {
      // ignore
    }
    activeTasks.delete(trackId);
  }
  for (const uri of [record?.localUri, record?.localArtworkUri]) {
    if (!uri) continue;
    try {
      const file = new File(uri);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // ignore
    }
  }
  await deleteDownloadDb(trackId);
}
