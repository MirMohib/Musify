/**
 * HearThis.at API v2 provider (free independent tracks & DJ mixes).
 * Respects each track's explicit `downloadable` permission flag.
 */

import type { MusicSourceProvider } from '@/services/sources/types';
import type { Track } from '@/types/music';

const HEARTHIS_BASE = 'https://api-v2.hearthis.at';

export interface HearThisTrackDto {
  id: string;
  title?: string;
  duration?: string | number;
  genre?: string;
  artwork_url?: string;
  thumb?: string;
  stream_url?: string;
  download_url?: string;
  downloadable?: string | number | boolean;
  release_date?: string;
  license?: string;
  user?: {
    id?: string;
    username?: string;
  };
}

export function mapHearThisTrack(item: HearThisTrackDto): Track {
  const downloadable =
    item.downloadable === true ||
    item.downloadable === 1 ||
    item.downloadable === '1';

  const durationSec = Number(item.duration ?? 0);
  const artistName = item.user?.username?.trim() || 'HearThis Artist';
  const artworkUrl = item.artwork_url || item.thumb || undefined;
  const year = item.release_date ? Number(item.release_date.slice(0, 4)) || undefined : undefined;
  const streamUrl =
    (downloadable && item.download_url) ||
    item.stream_url ||
    undefined;

  return {
    id: `hearthis:${item.id}`,
    sourceId: 'hearthis',
    sourceTrackId: String(item.id),
    title: item.title?.trim() || 'Untitled Mix',
    artist: artistName,
    artistId: item.user?.id
      ? `hearthis:${item.user.id}`
      : `hearthis_artist:${encodeURIComponent(artistName)}`,
    album: item.genre ? `${item.genre} · HearThis` : 'HearThis.at',
    albumId: `hearthis_album:${encodeURIComponent(item.genre || 'HearThis.at')}`,
    year,
    durationMs: Number.isFinite(durationSec) && durationSec > 0 ? Math.round(durationSec * 1000) : 0,
    artworkUrl,
    streamUrl,
    isDownloadable: Boolean(downloadable && streamUrl),
    license: item.license || (downloadable ? 'Artist Download Enabled (HearThis)' : 'Streaming Only (HearThis)'),
    genre: item.genre || undefined,
  };
}

export const hearthisSourceProvider: MusicSourceProvider = {
  id: 'hearthis',
  label: 'HearThis',
  supportsDownload: true,

  isConfigured() {
    return true;
  },

  async search(query: string, limit = 12): Promise<Track[]> {
    const q = query.trim();
    if (!q) return [];
    const url = `${HEARTHIS_BASE}/search/?t=${encodeURIComponent(q)}&page=1&count=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HearThis search failed (${res.status})`);
    }
    const json = (await res.json()) as HearThisTrackDto[];
    if (!Array.isArray(json)) return [];
    return json.map(mapHearThisTrack).filter((t) => Boolean(t.streamUrl));
  },

  async getTrending(limit = 10): Promise<Track[]> {
    const url = `${HEARTHIS_BASE}/?type=popular&page=1&count=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as HearThisTrackDto[];
    if (!Array.isArray(json)) return [];
    return json.map(mapHearThisTrack).filter((t) => Boolean(t.streamUrl));
  },

  async getTrack(sourceTrackId: string): Promise<Track | null> {
    const res = await fetch(`${HEARTHIS_BASE}/${encodeURIComponent(sourceTrackId)}/`);
    if (!res.ok) return null;
    const item = (await res.json()) as HearThisTrackDto;
    return item?.id ? mapHearThisTrack(item) : null;
  },

  async getStreamUrl(track: Track): Promise<string | null> {
    if (track.streamUrl) return track.streamUrl;
    const fresh = await this.getTrack(track.sourceTrackId);
    return fresh?.streamUrl ?? null;
  },

  isDownloadable(track: Track): boolean {
    return track.isDownloadable;
  },
};
