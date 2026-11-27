/**
 * Core domain models for Musify across audio playback, local SQLite persistence,
 * pluggable music source providers, and offline download management.
 */

export type MusicSourceId =
  | 'local'
  | 'jamendo'
  | 'audius'
  | 'archive'
  | 'hearthis'
  | 'radio'
  | 'custom'
  | 'seeded';

export type RepeatMode = 'off' | 'all' | 'one';

export type AudioQuality = 'low' | 'normal' | 'high' | 'lossless';

export type ThemeMode = 'dark' | 'amoled' | 'light';

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface Track {
  /** Globally unique ID in the format `${sourceId}:${sourceTrackId}` */
  id: string;
  sourceId: MusicSourceId;
  sourceTrackId: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  year?: number;
  durationMs: number;
  artworkUrl?: string;
  localArtworkUri?: string;
  /** Local asset module ID (require(...)) for bundled/seeded fallback art */
  artworkAsset?: number;
  streamUrl?: string;
  localUri?: string;
  isDownloadable: boolean;
  license?: string;
  explicit?: boolean;
  genre?: string;
  /** Dominant hex color used for full-player and detail header gradients */
  dominantColor?: string;
  lyricsPreview?: string;
}

export interface Album {
  id: string;
  sourceId: MusicSourceId;
  title: string;
  artist: string;
  artistId?: string;
  year?: number;
  artworkUrl?: string;
  artworkAsset?: number;
  dominantColor?: string;
  tracks: Track[];
}

export interface Artist {
  id: string;
  sourceId: MusicSourceId;
  name: string;
  artworkUrl?: string;
  artworkAsset?: number;
  followers?: number;
  bio?: string;
  genre?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  owner: string;
  artworkUrl?: string;
  artworkAsset?: number;
  trackIds: string[];
  likesCount?: number;
  isSystem?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DownloadRecord {
  trackId: string;
  status: DownloadStatus;
  progress: number; // 0 to 1
  bytesWritten: number;
  totalBytes: number;
  localUri?: string;
  localArtworkUri?: string;
  resumeStateJson?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  name: string;
  email: string;
  gender?: string;
  avatarAsset?: number;
  playlistsCount: number;
  followersCount: number;
  followingCount: number;
  favoriteArtists: string[];
  favoritePodcasts: string[];
  isGuest: boolean;
  onboarded: boolean;
}

export interface AppSettings {
  audioQuality: AudioQuality;
  downloadQuality: AudioQuality;
  maxDownloadStorageMb: number;
  downloadLocation: 'documents' | 'cache';
  offlineOnly: boolean;
  themeMode: ThemeMode;
  explicitContent: boolean;
  dataSaver: boolean;
}

export interface SearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  errors: { sourceId: MusicSourceId; message: string }[];
}
