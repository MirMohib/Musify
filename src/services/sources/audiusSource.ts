/**
 * Audius public discovery API provider (no API key required).
 * Uses https://api.audius.co to pick a healthy discovery node, then queries
 * trending, search, and track stream endpoints.
 */

import type { MusicSourceProvider } from '@/services/sources/types';
import type { Track } from '@/types/music';

const APP_NAME = 'Musify';
const FALLBACK_HOST = 'https://discoveryprovider.audius.co';

let cachedHost: string | null = null;
let cachedHostAt = 0;

async function getDiscoveryHost(): Promise<string> {
  if (cachedHost && Date.now() - cachedHostAt < 10 * 60 * 1000) {
    return cachedHost;
  }
  try {
    const res = await fetch('https://api.audius.co');
    if (res.ok) {
      const json = (await res.json()) as { data?: string[] };
      if (json.data?.length) {
        cachedHost = json.data[0];
        cachedHostAt = Date.now();
        return cachedHost;
      }
    }
  } catch {
    // Fallback below
  }
  return FALLBACK_HOST;
}

export interface AudiusTrackDto {
  id: string;
  title: string;
  duration?: number;
  genre?: string;
  is_downloadable?: boolean;
  downloadable?: boolean;
  release_date?: string;
  artwork?: {
    '150x150'?: string;
    '480x480'?: string;
    '1000x1000'?: string;
  };
  user?: {
    id?: string;
    name?: string;
    handle?: string;
  };
}

export function mapAudiusTrack(item: AudiusTrackDto, host: string): Track {
  const artworkUrl =
    item.artwork?.['480x480'] ?? item.artwork?.['1000x1000'] ?? item.artwork?.['150x150'];
  const downloadable = Boolean(item.is_downloadable || item.downloadable);
  const year = item.release_date ? Number(item.release_date.slice(0, 4)) || undefined : undefined;
  const artistName = item.user?.name || item.user?.handle || 'Audius Artist';
  const albumName = item.genre ? `${item.genre} · Audius` : 'Audius Releases';

  return {
    id: `audius:${item.id}`,
    sourceId: 'audius',
    sourceTrackId: item.id,
    title: item.title || 'Untitled',
    artist: artistName,
    artistId: item.user?.id
      ? `audius:${item.user.id}`
      : `audius_artist:${encodeURIComponent(artistName)}`,
    album: albumName,
    albumId: `audius_album:${encodeURIComponent(albumName)}`,
    year,
    durationMs: Math.round((item.duration || 0) * 1000),
    artworkUrl,
    streamUrl: `${host}/v1/tracks/${encodeURIComponent(item.id)}/stream?app_name=${APP_NAME}`,
    isDownloadable: downloadable,
    license: downloadable ? 'Artist Download Enabled (Audius)' : 'Streaming Only (Audius)',
    genre: item.genre,
  };
}

export const audiusSourceProvider: MusicSourceProvider = {
  id: 'audius',
  label: 'Audius',
  supportsDownload: true,

  isConfigured() {
    return true;
  },

  async search(query: string, limit = 15): Promise<Track[]> {
    const q = query.trim();
    if (!q) return [];
    const host = await getDiscoveryHost();
    const url = `${host}/v1/tracks/search?query=${encodeURIComponent(q)}&limit=${limit}&app_name=${APP_NAME}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Audius search failed (${res.status})`);
    }
    const json = (await res.json()) as { data?: AudiusTrackDto[] };
    return (json.data ?? []).map((item) => mapAudiusTrack(item, host));
  },

  async getTrending(limit = 12): Promise<Track[]> {
    const host = await getDiscoveryHost();
    const url = `${host}/v1/tracks/trending?limit=${limit}&app_name=${APP_NAME}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Audius trending failed (${res.status})`);
    }
    const json = (await res.json()) as { data?: AudiusTrackDto[] };
    return (json.data ?? []).map((item) => mapAudiusTrack(item, host));
  },

  async getTrack(sourceTrackId: string): Promise<Track | null> {
    const host = await getDiscoveryHost();
    const res = await fetch(
      `${host}/v1/tracks/${encodeURIComponent(sourceTrackId)}?app_name=${APP_NAME}`
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: AudiusTrackDto };
    return json.data ? mapAudiusTrack(json.data, host) : null;
  },

  async getStreamUrl(track: Track): Promise<string | null> {
    if (track.streamUrl) return track.streamUrl;
    const host = await getDiscoveryHost();
    return `${host}/v1/tracks/${encodeURIComponent(track.sourceTrackId)}/stream?app_name=${APP_NAME}`;
  },

  isDownloadable(track: Track): boolean {
    return track.isDownloadable;
  },
};
