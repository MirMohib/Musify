/**
 * Jamendo API v3 provider (free Creative Commons music, downloadable when permitted).
 * Requires EXPO_PUBLIC_JAMENDO_CLIENT_ID in .env; gracefully degrades when unset.
 */

import type { MusicSourceProvider } from '@/services/sources/types';
import type { AudioQuality, Track } from '@/types/music';

const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';

function getClientId(): string {
  return (process.env.EXPO_PUBLIC_JAMENDO_CLIENT_ID ?? '').trim();
}

interface JamendoTrackDto {
  id: string;
  name: string;
  duration: number;
  artist_id: string;
  artist_name: string;
  album_name?: string;
  album_id?: string;
  releasedate?: string;
  image?: string;
  album_image?: string;
  audio: string;
  audiodownload?: string;
  audiodownload_allowed?: boolean;
  license_ccurl?: string;
}

function mapJamendoTrack(item: JamendoTrackDto): Track {
  const downloadable = Boolean(item.audiodownload_allowed && (item.audiodownload || item.audio));
  const year = item.releasedate ? Number(item.releasedate.slice(0, 4)) || undefined : undefined;
  return {
    id: `jamendo:${item.id}`,
    sourceId: 'jamendo',
    sourceTrackId: item.id,
    title: item.name || 'Untitled',
    artist: item.artist_name || 'Jamendo Artist',
    artistId: item.artist_id ? `jamendo:${item.artist_id}` : undefined,
    album: item.album_name || undefined,
    albumId: item.album_id ? `jamendo:${item.album_id}` : undefined,
    year,
    durationMs: Math.round((item.duration || 0) * 1000),
    artworkUrl: item.album_image || item.image || undefined,
    streamUrl: item.audio,
    isDownloadable: downloadable,
    license: item.license_ccurl ? 'Creative Commons (Jamendo)' : 'Jamendo Free',
  };
}

export const jamendoSourceProvider: MusicSourceProvider = {
  id: 'jamendo',
  label: 'Jamendo',
  supportsDownload: true,

  isConfigured() {
    return getClientId().length > 0;
  },

  async search(query: string, limit = 15): Promise<Track[]> {
    const clientId = getClientId();
    if (!clientId || !query.trim()) return [];

    const params = new URLSearchParams({
      client_id: clientId,
      format: 'json',
      limit: String(limit),
      search: query.trim(),
      audioformat: 'mp32',
      include: 'licenses',
    });

    const res = await fetch(`${JAMENDO_BASE}/tracks/?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Jamendo search failed (${res.status})`);
    }
    const json = (await res.json()) as { results?: JamendoTrackDto[] };
    return (json.results ?? []).map(mapJamendoTrack);
  },

  async getTrending(limit = 10): Promise<Track[]> {
    const clientId = getClientId();
    if (!clientId) return [];

    const params = new URLSearchParams({
      client_id: clientId,
      format: 'json',
      limit: String(limit),
      order: 'popularity_week',
      audioformat: 'mp32',
    });
    const res = await fetch(`${JAMENDO_BASE}/tracks/?${params.toString()}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: JamendoTrackDto[] };
    return (json.results ?? []).map(mapJamendoTrack);
  },

  async getTrack(sourceTrackId: string): Promise<Track | null> {
    const clientId = getClientId();
    if (!clientId) return null;
    const params = new URLSearchParams({
      client_id: clientId,
      format: 'json',
      id: sourceTrackId,
      audioformat: 'mp32',
    });
    const res = await fetch(`${JAMENDO_BASE}/tracks/?${params.toString()}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: JamendoTrackDto[] };
    return json.results?.[0] ? mapJamendoTrack(json.results[0]) : null;
  },

  async getStreamUrl(track: Track, quality?: AudioQuality): Promise<string | null> {
    if (quality === 'lossless' && track.isDownloadable) {
      return track.streamUrl ?? null;
    }
    return track.streamUrl ?? null;
  },

  isDownloadable(track: Track): boolean {
    return track.isDownloadable;
  },
};
