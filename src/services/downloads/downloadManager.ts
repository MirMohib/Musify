/**
 * Offline download manager built on expo-file-system's DownloadTask (with native pause/resume)
 * and SQLite metadata persistence.
 * Enforces provider download permission (isTrackDownloadable) and storage limits.
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

function sanitizeFilename(track: Track): string {
  const slug = `${track.sourceId}_${track.sourceTrackId}_${track.title}`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64);
  return `${slug}.mp3`;
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

  await upsertTrack(track);

  const dir = getDownloadDirectory(settings.downloadLocation);
  const destFile = new File(dir, sanitizeFilename(track));
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
        resumeStateJson: undefined,
        error: undefined,
        updatedAt: Date.now(),
      };
      await upsertDownloadDb(record);
      onUpdate(record);
      return record;
    }

    // Null means task was paused
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
  if (record?.localUri) {
    try {
      const file = new File(record.localUri);
      if (file.exists) {
        file.delete();
      }
    } catch {
      // ignore
    }
  }
  await deleteDownloadDb(trackId);
}
