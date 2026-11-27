import { resolveYouTubeViaWebView } from '@/services/audio/youtubeWebViewBridge';
import type { MusicSourceProvider } from '@/services/sources/types';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Track } from '@/types/music';

export interface CustomTrackDto {
  id: string | number;
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  durationMs?: number;
  artworkUrl?: string;
  artwork?: string;
  cover?: string;
  streamUrl?: string;
  downloadable?: boolean;
  isDownloadable?: boolean;
  genre?: string;
  year?: number;
}

function normalizeBaseUrl(raw?: string): string {
  return (raw ?? '').trim().replace(/\/+$/, '');
}

export function mapCustomTrack(
  item: CustomTrackDto,
  baseUrl: string,
  allowDownloads: boolean
): Track {
  const idStr = String(item.id);
  const cleanBase = normalizeBaseUrl(baseUrl);
  const explicitStream = item.streamUrl?.trim() || undefined;

  const durationMs =
    typeof item.durationMs === 'number' && item.durationMs > 0
      ? item.durationMs
      : typeof item.duration === 'number' && item.duration > 0
        ? Math.round(item.duration * 1000)
        : 0;

  const explicitFlag = item.isDownloadable ?? item.downloadable;
  const isDownloadable = Boolean(
    allowDownloads && (explicitFlag === undefined ? true : explicitFlag) && (explicitStream || cleanBase)
  );

  const artistName = item.artist?.trim() || 'Custom Server Artist';
  const albumName = item.album?.trim() || 'Custom Server';

  return {
    id: `custom:${idStr}`,
    sourceId: 'custom',
    sourceTrackId: idStr,
    title: item.title?.trim() || 'Untitled Track',
    artist: artistName,
    artistId: `custom_artist:${encodeURIComponent(artistName)}`,
    album: albumName,
    albumId: `custom_album:${encodeURIComponent(albumName)}`,
    year: item.year,
    durationMs,
    artworkUrl: item.artworkUrl || item.artwork || item.cover || undefined,
    streamUrl: explicitStream,
    isDownloadable,
    license: 'Custom Audio Endpoint',
    genre: item.genre,
    dominantColor: '#264653',
  };
}

function extractItems(payload: unknown): CustomTrackDto[] {
  if (Array.isArray(payload)) return payload as CustomTrackDto[];
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.results)) return obj.results as CustomTrackDto[];
    if (Array.isArray(obj.tracks)) return obj.tracks as CustomTrackDto[];
    if (Array.isArray(obj.data)) return obj.data as CustomTrackDto[];
  }
  return [];
}

export const customApiSourceProvider: MusicSourceProvider = {
  id: 'custom',
  label: 'Custom Server',
  supportsDownload: true,

  isConfigured() {
    return normalizeBaseUrl(useSettingsStore.getState().settings.customApiUrl).length > 0;
  },

  async search(query: string, limit = 15): Promise<Track[]> {
    const settings = useSettingsStore.getState().settings;
    const baseUrl = normalizeBaseUrl(settings.customApiUrl);
    const q = query.trim();
    if (!baseUrl || !q) return [];

    const url = `${baseUrl}/search?q=${encodeURIComponent(q)}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Custom server search failed (${res.status})`);
    }
    const json: unknown = await res.json();
    return extractItems(json)
      .slice(0, limit)
      .map((item) => mapCustomTrack(item, baseUrl, settings.customApiDownloadable));
  },

  async getTrack(sourceTrackId: string): Promise<Track | null> {
    const settings = useSettingsStore.getState().settings;
    const baseUrl = normalizeBaseUrl(settings.customApiUrl);
    if (!baseUrl) return null;

    const res = await fetch(`${baseUrl}/tracks/${encodeURIComponent(sourceTrackId)}`);
    if (!res.ok) return null;
    const item = (await res.json()) as CustomTrackDto;
    return item?.id !== undefined
      ? mapCustomTrack(item, baseUrl, settings.customApiDownloadable)
      : null;
  },

  async getStreamUrl(track: Track): Promise<string | null> {
    if (track.streamUrl) return track.streamUrl;
    return await resolveYouTubeViaWebView(track.sourceTrackId);
  },

  isDownloadable(track: Track): boolean {
    const settings = useSettingsStore.getState().settings;
    return Boolean(settings.customApiDownloadable && track.isDownloadable);
  },
};