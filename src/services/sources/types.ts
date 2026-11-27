/**
 * Pluggable MusicSource provider contract.
 * Any legal music source (local device, Jamendo, Audius, Internet Archive, etc.)
 * implements this interface so search, playback, and downloads remain source-agnostic.
 */

import type { AudioQuality, MusicSourceId, Track } from '@/types/music';

export interface MusicSourceProvider {
  readonly id: MusicSourceId;
  readonly label: string;
  readonly supportsDownload: boolean;
  isConfigured(): boolean;
  search(query: string, limit?: number): Promise<Track[]>;
  getTrack(sourceTrackId: string): Promise<Track | null>;
  getStreamUrl(track: Track, quality?: AudioQuality): Promise<string | null>;
  isDownloadable(track: Track): boolean;
  getTrending?(limit?: number): Promise<Track[]>;
}
