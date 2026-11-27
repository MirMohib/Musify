/**
 * SQLite persistence layer for Musify using expo-sqlite.
 * Stores tracks, user playlists, liked songs, recently played history,
 * download metadata (including pause/resume state), recent searches,
 * user profile, and app settings.
 */

import * as SQLite from 'expo-sqlite';
import type {
  AppSettings,
  DownloadRecord,
  Playlist,
  Track,
  UserProfile,
} from '@/types/music';

const DB_NAME = 'musify.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initDatabase();
  }
  return dbPromise;
}

async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY NOT NULL,
      source_id TEXT NOT NULL,
      source_track_id TEXT NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      artist_id TEXT,
      album TEXT,
      album_id TEXT,
      year INTEGER,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      artwork_url TEXT,
      artwork_asset INTEGER,
      stream_url TEXT,
      local_uri TEXT,
      local_artwork_uri TEXT,
      is_downloadable INTEGER NOT NULL DEFAULT 0,
      license TEXT,
      explicit INTEGER NOT NULL DEFAULT 0,
      genre TEXT,
      dominant_color TEXT,
      lyrics_preview TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      owner TEXT NOT NULL,
      artwork_url TEXT,
      artwork_asset INTEGER,
      likes_count INTEGER DEFAULT 0,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      added_at INTEGER NOT NULL,
      PRIMARY KEY (playlist_id, track_id),
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS liked_tracks (
      track_id TEXT PRIMARY KEY NOT NULL,
      liked_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recently_played (
      track_id TEXT PRIMARY KEY NOT NULL,
      played_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS downloads (
      track_id TEXT PRIMARY KEY NOT NULL,
      status TEXT NOT NULL,
      progress REAL NOT NULL DEFAULT 0,
      bytes_written INTEGER NOT NULL DEFAULT 0,
      total_bytes INTEGER NOT NULL DEFAULT 0,
      local_uri TEXT,
      local_artwork_uri TEXT,
      resume_state_json TEXT,
      error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recent_searches (
      id TEXT PRIMARY KEY NOT NULL,
      query TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'query',
      title TEXT,
      subtitle TEXT,
      artwork_url TEXT,
      searched_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  // Safe schema migrations for existing installs
  try {
    await db.execAsync('ALTER TABLE tracks ADD COLUMN local_artwork_uri TEXT;');
  } catch {
    // Column already exists
  }
  try {
    await db.execAsync('ALTER TABLE downloads ADD COLUMN local_artwork_uri TEXT;');
  } catch {
    // Column already exists
  }

  return db;
}

interface TrackRow {
  id: string;
  source_id: string;
  source_track_id: string;
  title: string;
  artist: string;
  artist_id: string | null;
  album: string | null;
  album_id: string | null;
  year: number | null;
  duration_ms: number;
  artwork_url: string | null;
  local_artwork_uri: string | null;
  artwork_asset: number | null;
  stream_url: string | null;
  local_uri: string | null;
  is_downloadable: number;
  license: string | null;
  explicit: number;
  genre: string | null;
  dominant_color: string | null;
  lyrics_preview: string | null;
}

function rowToTrack(row: TrackRow): Track {
  return {
    id: row.id,
    sourceId: row.source_id as Track['sourceId'],
    sourceTrackId: row.source_track_id,
    title: row.title,
    artist: row.artist,
    artistId: row.artist_id ?? undefined,
    album: row.album ?? undefined,
    albumId: row.album_id ?? undefined,
    year: row.year ?? undefined,
    durationMs: row.duration_ms,
    artworkUrl: row.artwork_url ?? undefined,
    localArtworkUri: row.local_artwork_uri ?? undefined,
    artworkAsset: row.artwork_asset ?? undefined,
    streamUrl: row.stream_url ?? undefined,
    localUri: row.local_uri ?? undefined,
    isDownloadable: row.is_downloadable === 1,
    license: row.license ?? undefined,
    explicit: row.explicit === 1,
    genre: row.genre ?? undefined,
    dominantColor: row.dominant_color ?? undefined,
    lyricsPreview: row.lyrics_preview ?? undefined,
  };
}

export async function upsertTrack(track: Track): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO tracks (
      id, source_id, source_track_id, title, artist, artist_id, album, album_id,
      year, duration_ms, artwork_url, local_artwork_uri, artwork_asset, stream_url, local_uri,
      is_downloadable, license, explicit, genre, dominant_color, lyrics_preview, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      artist = excluded.artist,
      album = COALESCE(excluded.album, tracks.album),
      duration_ms = CASE WHEN excluded.duration_ms > 0 THEN excluded.duration_ms ELSE tracks.duration_ms END,
      artwork_url = COALESCE(excluded.artwork_url, tracks.artwork_url),
      local_artwork_uri = COALESCE(excluded.local_artwork_uri, tracks.local_artwork_uri),
      artwork_asset = COALESCE(excluded.artwork_asset, tracks.artwork_asset),
      stream_url = COALESCE(excluded.stream_url, tracks.stream_url),
      local_uri = COALESCE(excluded.local_uri, tracks.local_uri),
      is_downloadable = excluded.is_downloadable,
      license = COALESCE(excluded.license, tracks.license),
      dominant_color = COALESCE(excluded.dominant_color, tracks.dominant_color),
      updated_at = excluded.updated_at`,
    [
      track.id,
      track.sourceId,
      track.sourceTrackId,
      track.title,
      track.artist,
      track.artistId ?? null,
      track.album ?? null,
      track.albumId ?? null,
      track.year ?? null,
      track.durationMs,
      track.artworkUrl ?? null,
      track.localArtworkUri ?? null,
      track.artworkAsset ?? null,
      track.streamUrl ?? null,
      track.localUri ?? null,
      track.isDownloadable ? 1 : 0,
      track.license ?? null,
      track.explicit ? 1 : 0,
      track.genre ?? null,
      track.dominantColor ?? null,
      track.lyricsPreview ?? null,
      Date.now(),
    ]
  );
}

export async function upsertTracks(tracks: Track[]): Promise<void> {
  for (const track of tracks) {
    await upsertTrack(track);
  }
}

export async function getAllStoredTracks(): Promise<Track[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TrackRow>('SELECT * FROM tracks ORDER BY updated_at DESC');
  return rows.map(rowToTrack);
}

export async function getLocalTracks(): Promise<Track[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TrackRow>(
    "SELECT * FROM tracks WHERE source_id = 'local' ORDER BY updated_at DESC"
  );
  return rows.map(rowToTrack);
}

export async function deleteStoredTrack(trackId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM tracks WHERE id = ?', [trackId]);
}

export async function purgeLegacySeededData(): Promise<void> {
  const db = await getDatabase();
  const legacyPlaylistIds = [
    'playlist:front-left',
    'playlist:top-songs',
    'playlist:shazam',
    'playlist:roadtrip',
    'playlist:study',
  ];
  await db.runAsync("DELETE FROM liked_tracks WHERE track_id LIKE 'seeded:%'");
  await db.runAsync("DELETE FROM recently_played WHERE track_id LIKE 'seeded:%'");
  await db.runAsync("DELETE FROM playlist_tracks WHERE track_id LIKE 'seeded:%'");
  await db.runAsync("DELETE FROM tracks WHERE source_id = 'seeded' OR id LIKE 'seeded:%'");
  for (const plId of legacyPlaylistIds) {
    await db.runAsync('DELETE FROM playlists WHERE id = ?', [plId]);
  }
}

export async function getPlaylists(): Promise<Playlist[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    description: string | null;
    owner: string;
    artwork_url: string | null;
    artwork_asset: number | null;
    likes_count: number | null;
    is_system: number;
    created_at: number;
    updated_at: number;
  }>('SELECT * FROM playlists ORDER BY created_at DESC');

  const playlists: Playlist[] = [];
  for (const row of rows) {
    const trackRows = await db.getAllAsync<{ track_id: string }>(
      'SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC',
      [row.id]
    );
    playlists.push({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      owner: row.owner,
      artworkUrl: row.artwork_url ?? undefined,
      artworkAsset: row.artwork_asset ?? undefined,
      likesCount: row.likes_count ?? undefined,
      isSystem: row.is_system === 1,
      trackIds: trackRows.map((t) => t.track_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  return playlists;
}

export async function savePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO playlists (
      id, name, description, owner, artwork_url, artwork_asset, likes_count, is_system, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      artwork_url = excluded.artwork_url,
      artwork_asset = excluded.artwork_asset,
      likes_count = excluded.likes_count,
      updated_at = excluded.updated_at`,
    [
      playlist.id,
      playlist.name,
      playlist.description ?? null,
      playlist.owner,
      playlist.artworkUrl ?? null,
      playlist.artworkAsset ?? null,
      playlist.likesCount ?? 0,
      playlist.isSystem ? 1 : 0,
      playlist.createdAt,
      playlist.updatedAt,
    ]
  );

  await db.runAsync('DELETE FROM playlist_tracks WHERE playlist_id = ?', [playlist.id]);
  for (let i = 0; i < playlist.trackIds.length; i++) {
    await db.runAsync(
      'INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, added_at) VALUES (?, ?, ?, ?)',
      [playlist.id, playlist.trackIds[i], i, Date.now()]
    );
  }
}

export async function removePlaylist(playlistId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM playlists WHERE id = ?', [playlistId]);
}

export async function getLikedTrackIds(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ track_id: string }>(
    'SELECT track_id FROM liked_tracks ORDER BY liked_at DESC'
  );
  return rows.map((r) => r.track_id);
}

export async function setTrackLikedDb(trackId: string, liked: boolean): Promise<void> {
  const db = await getDatabase();
  if (liked) {
    await db.runAsync(
      'INSERT OR REPLACE INTO liked_tracks (track_id, liked_at) VALUES (?, ?)',
      [trackId, Date.now()]
    );
  } else {
    await db.runAsync('DELETE FROM liked_tracks WHERE track_id = ?', [trackId]);
  }
}

export async function getRecentlyPlayedIds(limit = 30): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ track_id: string }>(
    'SELECT track_id FROM recently_played ORDER BY played_at DESC LIMIT ?',
    [limit]
  );
  return rows.map((r) => r.track_id);
}

export async function recordRecentlyPlayedDb(trackId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO recently_played (track_id, played_at) VALUES (?, ?)',
    [trackId, Date.now()]
  );
}

export async function getDownloadsDb(): Promise<DownloadRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    track_id: string;
    status: string;
    progress: number;
    bytes_written: number;
    total_bytes: number;
    local_uri: string | null;
    local_artwork_uri: string | null;
    resume_state_json: string | null;
    error: string | null;
    created_at: number;
    updated_at: number;
  }>('SELECT * FROM downloads ORDER BY updated_at DESC');

  return rows.map((r) => ({
    trackId: r.track_id,
    status: r.status as DownloadRecord['status'],
    progress: r.progress,
    bytesWritten: r.bytes_written,
    totalBytes: r.total_bytes,
    localUri: r.local_uri ?? undefined,
    localArtworkUri: r.local_artwork_uri ?? undefined,
    resumeStateJson: r.resume_state_json ?? undefined,
    error: r.error ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function upsertDownloadDb(record: DownloadRecord): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO downloads (
      track_id, status, progress, bytes_written, total_bytes, local_uri, local_artwork_uri, resume_state_json, error, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(track_id) DO UPDATE SET
      status = excluded.status,
      progress = excluded.progress,
      bytes_written = excluded.bytes_written,
      total_bytes = excluded.total_bytes,
      local_uri = excluded.local_uri,
      local_artwork_uri = COALESCE(excluded.local_artwork_uri, downloads.local_artwork_uri),
      resume_state_json = excluded.resume_state_json,
      error = excluded.error,
      updated_at = excluded.updated_at`,
    [
      record.trackId,
      record.status,
      record.progress,
      record.bytesWritten,
      record.totalBytes,
      record.localUri ?? null,
      record.localArtworkUri ?? null,
      record.resumeStateJson ?? null,
      record.error ?? null,
      record.createdAt,
      record.updatedAt,
    ]
  );
}

export async function deleteDownloadDb(trackId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM downloads WHERE track_id = ?', [trackId]);
}

export interface RecentSearchItem {
  id: string;
  query: string;
  kind: 'query' | 'track' | 'artist' | 'album';
  title: string;
  subtitle?: string;
  artworkUrl?: string;
  searchedAt: number;
}

export async function getRecentSearchesDb(limit = 15): Promise<RecentSearchItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    query: string;
    kind: string;
    title: string | null;
    subtitle: string | null;
    artwork_url: string | null;
    searched_at: number;
  }>('SELECT * FROM recent_searches ORDER BY searched_at DESC LIMIT ?', [limit]);

  return rows.map((r) => ({
    id: r.id,
    query: r.query,
    kind: r.kind as RecentSearchItem['kind'],
    title: r.title ?? r.query,
    subtitle: r.subtitle ?? undefined,
    artworkUrl: r.artwork_url ?? undefined,
    searchedAt: r.searched_at,
  }));
}

export async function addRecentSearchDb(item: RecentSearchItem): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO recent_searches (id, query, kind, title, subtitle, artwork_url, searched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [item.id, item.query, item.kind, item.title, item.subtitle ?? null, item.artworkUrl ?? null, item.searchedAt]
  );
}

export async function clearRecentSearchesDb(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM recent_searches');
}

export async function getKvJson<T>(key: string): Promise<T | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv_store WHERE key = ?', [
    key,
  ]);
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export async function setKvJson<T>(key: string, value: T): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)', [
    key,
    JSON.stringify(value),
  ]);
}

export const DEFAULT_SETTINGS: AppSettings = {
  audioQuality: 'high',
  downloadQuality: 'high',
  maxDownloadStorageMb: 2048,
  downloadLocation: 'documents',
  offlineOnly: false,
  themeMode: 'dark',
  explicitContent: true,
  dataSaver: false,
  customApiUrl: '',
  customApiDownloadable: true,
};

export const DEFAULT_PROFILE: UserProfile = {
  name: 'maya',
  email: 'maya@musify.app',
  playlistsCount: 23,
  followersCount: 58,
  followingCount: 43,
  favoriteArtists: ['Lana Del Rey', 'Marvin Gaye', 'FKA twigs'],
  favoritePodcasts: ['Indie Weekly', 'Sound Design Daily'],
  isGuest: false,
  onboarded: false,
};
