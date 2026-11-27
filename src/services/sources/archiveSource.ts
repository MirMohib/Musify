/**
 * Internet Archive / Free Music Archive public-domain & Creative Commons audio provider.
 * Requires no API key. Uses advancedsearch.php to locate audio items and /metadata/:id
 * to resolve direct MP3/OGG stream URLs.
 */

import type { MusicSourceProvider } from '@/services/sources/types';
import type { Track } from '@/types/music';

export interface ArchiveDoc {
  identifier: string;
  title?: string;
  creator?: string | string[];
  year?: string;
  licenseurl?: string;
}

interface ArchiveFileEntry {
  name: string;
  format?: string;
  length?: string;
  title?: string;
  artist?: string;
}

function normalizeCreator(creator?: string | string[]): string {
  if (Array.isArray(creator)) return creator[0] || 'Internet Archive';
  return creator || 'Internet Archive';
}

function parseLengthToMs(length?: string): number {
  if (!length) return 0;
  if (length.includes(':')) {
    const parts = length.split(':').map((n) => Number(n) || 0);
    if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
    if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  const secs = Number(length);
  return Number.isFinite(secs) ? Math.round(secs * 1000) : 0;
}

async function resolveArchiveAudioFile(identifier: string): Promise<{
  streamUrl: string | null;
  durationMs: number;
}> {
  try {
    const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
    if (!res.ok) return { streamUrl: null, durationMs: 0 };
    const json = (await res.json()) as { files?: ArchiveFileEntry[] };
    const files = json.files ?? [];
    const mp3 =
      files.find((f) => f.name.toLowerCase().endsWith('.mp3') && !f.name.startsWith('_')) ??
      files.find((f) => f.name.toLowerCase().endsWith('.ogg') && !f.name.startsWith('_'));

    if (!mp3) return { streamUrl: null, durationMs: 0 };
    return {
      streamUrl: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(mp3.name)}`,
      durationMs: parseLengthToMs(mp3.length),
    };
  } catch {
    return { streamUrl: null, durationMs: 0 };
  }
}

export function mapArchiveDoc(doc: ArchiveDoc): Track {
  const artistName = normalizeCreator(doc.creator);
  return {
    id: `archive:${doc.identifier}`,
    sourceId: 'archive',
    sourceTrackId: doc.identifier,
    title: doc.title || doc.identifier,
    artist: artistName,
    artistId: `archive_artist:${encodeURIComponent(artistName)}`,
    album: 'Internet Archive Audio',
    albumId: `archive_album:${encodeURIComponent(doc.identifier)}`,
    year: doc.year ? Number(doc.year) || undefined : undefined,
    durationMs: 0,
    artworkUrl: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
    isDownloadable: true,
    license: doc.licenseurl ? 'Creative Commons / Public Domain' : 'Internet Archive Audio',
  };
}

export const archiveSourceProvider: MusicSourceProvider = {
  id: 'archive',
  label: 'Internet Archive',
  supportsDownload: true,

  isConfigured() {
    return true;
  },

  async search(query: string, limit = 10): Promise<Track[]> {
    const q = query.trim();
    if (!q) return [];

    const searchQuery = `(${q}) AND mediatype:audio AND (format:MP3 OR format:"VBR MP3")`;
    const url =
      `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}` +
      `&fl[]=identifier,title,creator,year,licenseurl&sort[]=downloads+desc&rows=${limit}&page=1&output=json`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Internet Archive search failed (${res.status})`);
    }
    const json = (await res.json()) as { response?: { docs?: ArchiveDoc[] } };
    return (json.response?.docs ?? []).map(mapArchiveDoc);
  },

  async getTrending(limit = 10): Promise<Track[]> {
    const searchQuery =
      'mediatype:audio AND (collection:freemusicarchive OR collection:netlabels OR collection:audio_music) AND (format:MP3 OR format:"VBR MP3")';
    const url =
      `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}` +
      `&fl[]=identifier,title,creator,year,licenseurl&sort[]=downloads+desc&rows=${limit}&page=1&output=json`;

    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { response?: { docs?: ArchiveDoc[] } };
    return (json.response?.docs ?? []).map(mapArchiveDoc);
  },

  async getTrack(sourceTrackId: string): Promise<Track | null> {
    const resolved = await resolveArchiveAudioFile(sourceTrackId);
    if (!resolved.streamUrl) return null;
    return {
      id: `archive:${sourceTrackId}`,
      sourceId: 'archive',
      sourceTrackId,
      title: sourceTrackId,
      artist: 'Internet Archive',
      artistId: 'archive_artist:Internet%20Archive',
      album: 'Internet Archive Audio',
      albumId: `archive_album:${encodeURIComponent(sourceTrackId)}`,
      durationMs: resolved.durationMs,
      artworkUrl: `https://archive.org/services/img/${encodeURIComponent(sourceTrackId)}`,
      streamUrl: resolved.streamUrl,
      isDownloadable: true,
      license: 'Internet Archive Audio',
    };
  },

  async getStreamUrl(track: Track): Promise<string | null> {
    if (track.streamUrl) return track.streamUrl;
    const resolved = await resolveArchiveAudioFile(track.sourceTrackId);
    if (resolved.durationMs > 0 && track.durationMs === 0) {
      track.durationMs = resolved.durationMs;
    }
    track.streamUrl = resolved.streamUrl ?? undefined;
    return resolved.streamUrl;
  },

  isDownloadable(): boolean {
    return true;
  },
};
