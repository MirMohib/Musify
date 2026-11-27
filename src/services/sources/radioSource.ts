/**
 * Radio Browser public API provider (https://de1.api.radio-browser.info/).
 * Provides live global internet radio streams (streaming-only, isDownloadable: false).
 */

import type { MusicSourceProvider } from '@/services/sources/types';
import type { Track } from '@/types/music';

const RADIO_BASE = 'https://de1.api.radio-browser.info';

export interface RadioStationDto {
  stationuuid: string;
  name?: string;
  url?: string;
  url_resolved?: string;
  favicon?: string;
  tags?: string;
  country?: string;
  codec?: string;
  bitrate?: number;
}

export function mapRadioStation(item: RadioStationDto): Track {
  const streamUrl = item.url_resolved || item.url || undefined;
  const firstTag = item.tags
    ?.split(',')
    .map((t) => t.trim())
    .find(Boolean);
  const subtitle = [item.country?.trim(), firstTag].filter(Boolean).join(' · ') || 'Live Radio';

  return {
    id: `radio:${item.stationuuid}`,
    sourceId: 'radio',
    sourceTrackId: item.stationuuid,
    title: item.name?.trim() || 'Radio Station',
    artist: subtitle,
    artistId: `radio_artist:${encodeURIComponent(subtitle)}`,
    album: 'Live Internet Radio',
    albumId: 'radio_album:live',
    durationMs: 0,
    artworkUrl: item.favicon && item.favicon.startsWith('http') ? item.favicon : undefined,
    streamUrl,
    isDownloadable: false,
    license: 'Live Broadcast Stream',
    genre: firstTag,
    dominantColor: '#4A2545',
  };
}

export const radioSourceProvider: MusicSourceProvider = {
  id: 'radio',
  label: 'Radio',
  supportsDownload: false,

  isConfigured() {
    return true;
  },

  async search(query: string, limit = 12): Promise<Track[]> {
    const q = query.trim();
    if (!q) return [];
    const url =
      `${RADIO_BASE}/json/stations/search?name=${encodeURIComponent(q)}` +
      `&limit=${limit}&hidebroken=true&order=votes&reverse=true`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Radio Browser search failed (${res.status})`);
    }
    const json = (await res.json()) as RadioStationDto[];
    if (!Array.isArray(json)) return [];
    return json.map(mapRadioStation).filter((t) => Boolean(t.streamUrl));
  },

  async getTrending(limit = 10): Promise<Track[]> {
    const url = `${RADIO_BASE}/json/stations/topvote/${limit}?hidebroken=true`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as RadioStationDto[];
    if (!Array.isArray(json)) return [];
    return json.map(mapRadioStation).filter((t) => Boolean(t.streamUrl));
  },

  async getTrack(sourceTrackId: string): Promise<Track | null> {
    const res = await fetch(`${RADIO_BASE}/json/stations/byuuid/${encodeURIComponent(sourceTrackId)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as RadioStationDto[];
    return json?.[0] ? mapRadioStation(json[0]) : null;
  },

  async getStreamUrl(track: Track): Promise<string | null> {
    return track.streamUrl ?? null;
  },

  isDownloadable(): boolean {
    return false;
  },
};
