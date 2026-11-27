import type { MusicSourceProvider } from '@/services/sources/types';
import type { AudioQuality, Track } from '@/types/music';

/**
 * Multi-instance federated Piped & Invidious endpoints (zero backend required).
 * If one instance is rate-limited or offline, requests automatically fail over.
 */
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.private.coffee',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.darkness.services',
];

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yewtu.be',
  'https://iv.ggtyler.dev',
];

const REQUEST_TIMEOUT_MS = 4500;

async function fetchJsonWithTimeout(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function extractVideoId(rawUrlOrId: string): string {
  if (!rawUrlOrId) return '';
  if (!rawUrlOrId.includes('/') && !rawUrlOrId.includes('?')) {
    return rawUrlOrId;
  }
  const vMatch = rawUrlOrId.match(/[?&]v=([^&]+)/);
  if (vMatch?.[1]) return vMatch[1];
  const shortMatch = rawUrlOrId.match(/youtu\.be\/([^?&/]+)/);
  if (shortMatch?.[1]) return shortMatch[1];
  return rawUrlOrId.split('/').pop() ?? rawUrlOrId;
}

function mapPipedSearchItem(item: any): Track | null {
  const videoId = extractVideoId(item?.url ?? '');
  if (!videoId || !item?.title) return null;

  const durationSec = Number(item.duration ?? 0);
  if (durationSec <= 0) return null; // Skip live streams

  return {
    id: `youtube:${videoId}`,
    sourceId: 'youtube',
    sourceTrackId: videoId,
    title: String(item.title),
    artist: String(item.uploaderName ?? 'YouTube Music').replace(/ - Topic$/i, ''),
    artistId: item.uploaderUrl ? String(item.uploaderUrl) : undefined,
    durationMs: durationSec * 1000,
    artworkUrl: item.thumbnail ? String(item.thumbnail) : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    isDownloadable: true,
    dominantColor: '#E53935',
  };
}

function mapInvidiousSearchItem(item: any): Track | null {
  const videoId = String(item?.videoId ?? '');
  if (!videoId || !item?.title) return null;

  const durationSec = Number(item.lengthSeconds ?? 0);
  if (durationSec <= 0) return null;

  const thumb =
    Array.isArray(item.videoThumbnails) && item.videoThumbnails.length > 0
      ? item.videoThumbnails[0].url
      : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    id: `youtube:${videoId}`,
    sourceId: 'youtube',
    sourceTrackId: videoId,
    title: String(item.title),
    artist: String(item.author ?? 'YouTube Music').replace(/ - Topic$/i, ''),
    artistId: item.authorId ? String(item.authorId) : undefined,
    durationMs: durationSec * 1000,
    artworkUrl: String(thumb),
    isDownloadable: true,
    dominantColor: '#E53935',
  };
}

function pickBestAudioStream(
  streams: { url?: string; mimeType?: string; bitrate?: number; audioOnly?: boolean }[],
  quality: AudioQuality
): string | null {
  const valid = streams.filter((s) => Boolean(s?.url));
  if (valid.length === 0) return null;

  // Prefer m4a / mp4 AAC streams for universal iOS & Android expo-audio support
  const m4aStreams = valid.filter((s) =>
    (s.mimeType ?? '').toLowerCase().includes('mp4') || (s.mimeType ?? '').toLowerCase().includes('m4a')
  );
  const pool = m4aStreams.length > 0 ? m4aStreams : valid;

  const sorted = [...pool].sort((a, b) => Number(b.bitrate ?? 0) - Number(a.bitrate ?? 0));
  if (quality === 'low') {
    return sorted[sorted.length - 1]?.url ?? null;
  }
  return sorted[0]?.url ?? null;
}

async function resolveStreamFromPiped(videoId: string, quality: AudioQuality): Promise<string | null> {
  for (const base of PIPED_INSTANCES) {
    try {
      const data = await fetchJsonWithTimeout(`${base}/streams/${encodeURIComponent(videoId)}`);
      const audioStreams = Array.isArray(data?.audioStreams) ? data.audioStreams : [];
      const url = pickBestAudioStream(audioStreams, quality);
      if (url) return url;
    } catch {
      // Try next instance
    }
  }
  return null;
}

async function resolveStreamFromInvidious(videoId: string, quality: AudioQuality): Promise<string | null> {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const data = await fetchJsonWithTimeout(`${base}/api/v1/videos/${encodeURIComponent(videoId)}`);
      const formats = Array.isArray(data?.adaptiveFormats) ? data.adaptiveFormats : [];
      const audioOnly = formats
        .filter((f: any) => String(f?.type ?? '').startsWith('audio/'))
        .map((f: any) => ({
          url: f.url,
          mimeType: f.type,
          bitrate: Number(f.bitrate ?? 0),
        }));
      const url = pickBestAudioStream(audioOnly, quality);
      if (url) return url;
    } catch {
      // Try next instance
    }
  }
  return null;
}

export const youtubeSourceProvider: MusicSourceProvider = {
  id: 'youtube',
  label: 'YouTube',
  supportsDownload: true,

  isConfigured() {
    return true;
  },

  isDownloadable() {
    return true;
  },

  async search(query: string, limit = 15): Promise<Track[]> {
    const encoded = encodeURIComponent(query);

    // 1. Try Piped instances (prefer music_songs filter, fall back to general videos)
    for (const base of PIPED_INSTANCES) {
      try {
        const data = await fetchJsonWithTimeout(`${base}/search?q=${encoded}&filter=music_songs`);
        const items = Array.isArray(data?.items) ? data.items : [];
        const tracks = items
          .map(mapPipedSearchItem)
          .filter((t: Track | null): t is Track => t !== null)
          .slice(0, limit);
        if (tracks.length > 0) return tracks;
      } catch {
        // Fail over to next Piped instance
      }
    }

    // 2. Fallback to Invidious instances
    for (const base of INVIDIOUS_INSTANCES) {
      try {
        const data = await fetchJsonWithTimeout(
          `${base}/api/v1/search?q=${encoded}&type=video`
        );
        const items = Array.isArray(data) ? data : [];
        const tracks = items
          .map(mapInvidiousSearchItem)
          .filter((t: Track | null): t is Track => t !== null)
          .slice(0, limit);
        if (tracks.length > 0) return tracks;
      } catch {
        // Fail over to next Invidious instance
      }
    }

    return [];
  },

  async getTrack(sourceTrackId: string): Promise<Track | null> {
    const streamUrl = await this.getStreamUrl(
      {
        id: `youtube:${sourceTrackId}`,
        sourceId: 'youtube',
        sourceTrackId,
        title: sourceTrackId,
        artist: 'YouTube Music',
        durationMs: 0,
        isDownloadable: true,
      },
      'high'
    );
    if (!streamUrl) return null;

    return {
      id: `youtube:${sourceTrackId}`,
      sourceId: 'youtube',
      sourceTrackId,
      title: sourceTrackId,
      artist: 'YouTube Music',
      durationMs: 0,
      artworkUrl: `https://i.ytimg.com/vi/${sourceTrackId}/hqdefault.jpg`,
      streamUrl,
      isDownloadable: true,
    };
  },

  async getStreamUrl(track: Track, quality: AudioQuality = 'high'): Promise<string | null> {
    const pipedUrl = await resolveStreamFromPiped(track.sourceTrackId, quality);
    if (pipedUrl) return pipedUrl;

    return await resolveStreamFromInvidious(track.sourceTrackId, quality);
  },
};