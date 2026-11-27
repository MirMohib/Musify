/**
 * Unified MusicSource registry aggregating Local, Audius, Jamendo, Internet Archive,
 * HearThis.at, Radio Browser, and Custom Audio Endpoint.
 * Resolves playable URIs with offline-first priority (downloaded file -> local URI -> stream URL).
 */

import { File } from 'expo-file-system';

import { archiveSourceProvider } from '@/services/sources/archiveSource';
import { audiusSourceProvider } from '@/services/sources/audiusSource';
import { customApiSourceProvider } from '@/services/sources/customApiSource';
import { hearthisSourceProvider } from '@/services/sources/hearthisSource';
import { jamendoSourceProvider } from '@/services/sources/jamendoSource';
import { localSourceProvider } from '@/services/sources/localSource';
import { radioSourceProvider } from '@/services/sources/radioSource';
import type { MusicSourceProvider } from '@/services/sources/types';
import { upsertTracks } from '@/services/storage/database';
import type { AppSettings, DownloadRecord, MusicSourceId, Track } from '@/types/music';

const PROVIDERS: Record<Exclude<MusicSourceId, 'seeded'>, MusicSourceProvider> = {
  local: localSourceProvider,
  audius: audiusSourceProvider,
  jamendo: jamendoSourceProvider,
  archive: archiveSourceProvider,
  hearthis: hearthisSourceProvider,
  radio: radioSourceProvider,
  custom: customApiSourceProvider,
};

export function getProvider(sourceId: MusicSourceId): MusicSourceProvider | null {
  if (sourceId === 'seeded') return null;
  return PROVIDERS[sourceId] ?? null;
}

export function getAllProviders(): MusicSourceProvider[] {
  return Object.values(PROVIDERS);
}

export class OfflineModeError extends Error {
  constructor(message = 'Offline only mode is enabled. Download this track to listen offline.') {
    super(message);
    this.name = 'OfflineModeError';
  }
}

/**
 * Resolves a playable URI for a track, preferring downloaded/local files first.
 */
export async function resolvePlayableUri(
  track: Track,
  settings: AppSettings,
  downloadRecord?: DownloadRecord
): Promise<string> {
  if (downloadRecord?.status === 'completed' && downloadRecord.localUri) {
    try {
      const f = new File(downloadRecord.localUri);
      if (f.exists) {
        return downloadRecord.localUri;
      }
    } catch {
      return downloadRecord.localUri;
    }
  }

  if (track.sourceId === 'local' && track.localUri) {
    return track.localUri;
  }

  if (settings.offlineOnly) {
    throw new OfflineModeError();
  }

  if (track.streamUrl) {
    return track.streamUrl;
  }

  const provider = getProvider(track.sourceId);
  if (provider) {
    const resolved = await provider.getStreamUrl(track, settings.audioQuality);
    if (resolved) return resolved;
  }

  throw new Error(`No playable stream URL available for "${track.title}".`);
}

export function isTrackDownloadable(track: Track): boolean {
  if (track.sourceId === 'local' || track.sourceId === 'seeded') return false;
  const provider = getProvider(track.sourceId);
  return provider ? provider.isDownloadable(track) : false;
}

export interface UnifiedSearchOutput {
  tracks: Track[];
  errors: { sourceId: MusicSourceId; message: string }[];
}

/**
 * Searches across all enabled music sources in parallel.
 * When offlineOnly is true, only searches local device & cached/downloaded tracks.
 */
export async function searchAllSources(
  query: string,
  offlineOnly: boolean,
  sourceFilter?: MusicSourceId | 'all'
): Promise<UnifiedSearchOutput> {
  const q = query.trim();
  if (!q) return { tracks: [], errors: [] };

  const activeProviders: MusicSourceProvider[] = offlineOnly
    ? [localSourceProvider]
    : getAllProviders().filter((p) => {
        if (sourceFilter && sourceFilter !== 'all' && p.id !== sourceFilter) return false;
        return p.isConfigured();
      });

  const errors: UnifiedSearchOutput['errors'] = [];
  const results = await Promise.all(
    activeProviders.map(async (provider) => {
      try {
        return await provider.search(q, 12);
      } catch (err) {
        errors.push({
          sourceId: provider.id,
          message: err instanceof Error ? err.message : `${provider.label} search failed`,
        });
        return [];
      }
    })
  );

  // Interleave results across sources so users see diverse sources together
  const merged: Track[] = [];
  const maxLen = Math.max(0, ...results.map((r) => r.length));
  for (let i = 0; i < maxLen; i++) {
    for (const bucket of results) {
      if (bucket[i]) merged.push(bucket[i]);
    }
  }

  if (merged.length > 0) {
    upsertTracks(merged).catch(() => {});
  }

  return { tracks: merged, errors };
}

export interface DiscoveryFeed {
  audiusTracks: Track[];
  jamendoTracks: Track[];
  archiveTracks: Track[];
  hearthisTracks: Track[];
  radioTracks: Track[];
  allTracks: Track[];
}

export async function fetchDiscoveryFeed(): Promise<DiscoveryFeed> {
  const [audiusTracks, jamendoTracks, archiveTracks, hearthisTracks, radioTracks] =
    await Promise.all([
      audiusSourceProvider.getTrending
        ? audiusSourceProvider.getTrending(10).catch(() => [])
        : Promise.resolve([]),
      jamendoSourceProvider.isConfigured() && jamendoSourceProvider.getTrending
        ? jamendoSourceProvider.getTrending(8).catch(() => [])
        : Promise.resolve([]),
      archiveSourceProvider.getTrending
        ? archiveSourceProvider.getTrending(8).catch(() => [])
        : Promise.resolve([]),
      hearthisSourceProvider.getTrending
        ? hearthisSourceProvider.getTrending(8).catch(() => [])
        : Promise.resolve([]),
      radioSourceProvider.getTrending
        ? radioSourceProvider.getTrending(6).catch(() => [])
        : Promise.resolve([]),
    ]);

  const allTracks = [
    ...audiusTracks,
    ...hearthisTracks,
    ...jamendoTracks,
    ...archiveTracks,
    ...radioTracks,
  ];
  if (allTracks.length > 0) {
    upsertTracks(allTracks).catch(() => {});
  }

  return {
    audiusTracks,
    jamendoTracks,
    archiveTracks,
    hearthisTracks,
    radioTracks,
    allTracks,
  };
}
