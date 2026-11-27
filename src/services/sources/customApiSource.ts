/**
 * Configurable Custom Audio Endpoint provider.
 * - Search: GET {baseUrl}/search?q={query} (served via always-on Cloudflare Worker)
 * - Stream: Resolves direct M4A/MP4 audio on-device from the user's residential/cellular IP
 *   so YouTube Music / Content-ID tracks play & download in full length without datacenter IP blocks.
 */

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

const resolvedUrlCache = new Map<string, { url: string; expiresAt: number }>();

async function resolveYouTubeDirectOnDevice(rawVideoId: string): Promise<string | null> {
  const videoId = rawVideoId.replace(/^yt_/, '').trim();
  if (!videoId) return null;

  const cached = resolvedUrlCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const clients = [
    {
      ua: 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X)',
      client: {
        clientName: 'IOS',
        clientVersion: '19.45.4',
        deviceMake: 'Apple',
        deviceModel: 'iPhone16,2',
        osName: 'iPhone',
        osVersion: '18.1.0.22B83',
        hl: 'en',
        gl: 'PK',
      },
    },
    {
      ua: 'com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
      client: {
        clientName: 'ANDROID_VR',
        clientVersion: '1.60.19',
        osName: 'Android',
        osVersion: '12L',
        hl: 'en',
        gl: 'PK',
      },
    },
    {
      ua: 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version',
      client: {
        clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
        clientVersion: '2.0',
        hl: 'en',
        gl: 'PK',
      },
      thirdParty: { embedUrl: 'https://www.youtube.com/' },
    },
  ];

  for (const cfg of clients) {
    try {
      const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': cfg.ua,
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: cfg.client,
            ...(cfg.thirdParty ? { thirdParty: cfg.thirdParty } : {}),
          },
          contentCheckOk: true,
          racyCheckOk: true,
        }),
      });

      if (!res.ok) continue;
      const data = (await res.json()) as {
        streamingData?: {
          adaptiveFormats?: Array<{ url?: string; mimeType?: string; bitrate?: number }>;
          formats?: Array<{ url?: string; mimeType?: string; bitrate?: number }>;
        };
      };

      const formats = [
        ...(data?.streamingData?.adaptiveFormats ?? []),
        ...(data?.streamingData?.formats ?? []),
      ];

      const audioFormats = formats
        .filter((f) => Boolean(f?.url) && String(f?.mimeType ?? '').startsWith('audio/'))
        .sort((a, b) => Number(b.bitrate ?? 0) - Number(a.bitrate ?? 0));

      // Prefer MP4/AAC (.m4a) for native iOS AVPlayer & Android ExoPlayer compatibility
      const best =
        audioFormats.find((f) => String(f.mimeType).includes('mp4')) ?? audioFormats[0];

      if (best?.url) {
        resolvedUrlCache.set(videoId, {
          url: best.url,
          expiresAt: Date.now() + 45 * 60 * 1000,
        });
        return best.url;
      }
    } catch {
      // Try next InnerTube client
    }
  }

  return null;
}

export function mapCustomTrack(
  item: CustomTrackDto,
  baseUrl: string,
  allowDownloads: boolean
): Track {
  const idStr = String(item.id);
  const cleanBase = normalizeBaseUrl(baseUrl);
  // Leave streamUrl undefined unless explicitly provided so getStreamUrl() resolves on-device
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

    // 1. Resolve directly on the user's device IP (bypasses cloud datacenter IP blocks)
    const directUrl = await resolveYouTubeDirectOnDevice(track.sourceTrackId);
    if (directUrl) return directUrl;

    // 2. Fallback to custom server /stream endpoint if configured
    const baseUrl = normalizeBaseUrl(useSettingsStore.getState().settings.customApiUrl);
    if (!baseUrl) return null;
    return `${baseUrl}/stream/${encodeURIComponent(track.sourceTrackId)}`;
  },

  isDownloadable(track: Track): boolean {
    const settings = useSettingsStore.getState().settings;
    return Boolean(settings.customApiDownloadable && track.isDownloadable);
  },
};