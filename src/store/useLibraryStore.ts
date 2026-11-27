import { create } from 'zustand';

import { SEEDED_PLAYLISTS, SEEDED_TRACKS } from '@/data/seedCatalog';
import {
  importDeviceAudioFiles,
  scanAndroidDeviceAudio,
} from '@/services/sources/localSource';
import { fetchRemoteTrending } from '@/services/sources/sourceRegistry';
import {
  addRecentSearchDb,
  clearRecentSearchesDb,
  getAllStoredTracks,
  getKvJson,
  getLikedTrackIds,
  getPlaylists,
  getRecentlyPlayedIds,
  getRecentSearchesDb,
  recordRecentlyPlayedDb,
  removePlaylist,
  savePlaylist,
  setKvJson,
  setTrackLikedDb,
  upsertTrack,
  upsertTracks,
  type RecentSearchItem,
} from '@/services/storage/database';
import type { Playlist, Track } from '@/types/music';

const SEEDED_KEY = 'musify_seeded_v1';

interface LibraryState {
  tracksById: Record<string, Track>;
  playlists: Playlist[];
  likedTrackIds: string[];
  recentlyPlayedIds: string[];
  remoteTrending: Track[];
  recentSearches: RecentSearchItem[];
  hiddenTrackIds: string[];
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  registerTracks: (tracks: Track[]) => void;
  toggleLike: (track: Track) => Promise<boolean>;
  likeAllTracks: (tracks: Track[]) => Promise<void>;
  hideTrack: (trackId: string) => void;
  recordPlayed: (track: Track) => Promise<void>;

  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  updatePlaylist: (id: string, name: string, description?: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;

  importLocalMusic: () => Promise<{ imported: Track[]; canceled: boolean }>;
  scanLocalMusic: () => Promise<{ count: number; message?: string }>;

  addRecentSearch: (item: Omit<RecentSearchItem, 'searchedAt'>) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
  refreshTrending: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracksById: {},
  playlists: [],
  likedTrackIds: [],
  recentlyPlayedIds: [],
  remoteTrending: [],
  recentSearches: [],
  hiddenTrackIds: [],
  isHydrated: false,

  hydrate: async () => {
    const alreadySeeded = await getKvJson<boolean>(SEEDED_KEY);
    if (!alreadySeeded) {
      await upsertTracks(SEEDED_TRACKS);
      for (const pl of SEEDED_PLAYLISTS) {
        await savePlaylist(pl);
      }
      await setTrackLikedDb(SEEDED_TRACKS[0].id, true);
      await setTrackLikedDb(SEEDED_TRACKS[1].id, true);
      await recordRecentlyPlayedDb(SEEDED_TRACKS[0].id);
      await recordRecentlyPlayedDb(SEEDED_TRACKS[2].id);
      await setKvJson(SEEDED_KEY, true);
    }

    const [storedTracks, playlists, likedTrackIds, recentlyPlayedIds, recentSearches] =
      await Promise.all([
        getAllStoredTracks(),
        getPlaylists(),
        getLikedTrackIds(),
        getRecentlyPlayedIds(30),
        getRecentSearchesDb(15),
      ]);

    const tracksById: Record<string, Track> = {};
    for (const t of SEEDED_TRACKS) {
      tracksById[t.id] = t;
    }
    for (const t of storedTracks) {
      tracksById[t.id] = {
        ...tracksById[t.id],
        ...t,
        artworkAsset: t.artworkAsset ?? tracksById[t.id]?.artworkAsset,
      };
    }

    set({
      tracksById,
      playlists,
      likedTrackIds,
      recentlyPlayedIds,
      recentSearches,
      isHydrated: true,
    });

    // Non-blocking background fetch for Audius / Jamendo trending
    fetchRemoteTrending()
      .then((trending) => {
        if (trending.length > 0) {
          get().registerTracks(trending);
          set({ remoteTrending: trending });
        }
      })
      .catch(() => {});
  },

  registerTracks: (tracks) => {
    set((state) => {
      const next = { ...state.tracksById };
      for (const t of tracks) {
        next[t.id] = {
          ...next[t.id],
          ...t,
          artworkAsset: t.artworkAsset ?? next[t.id]?.artworkAsset,
        };
      }
      return { tracksById: next };
    });
  },

  toggleLike: async (track) => {
    await upsertTrack(track);
    const currentLiked = get().likedTrackIds;
    const isLiked = currentLiked.includes(track.id);
    const nextLiked = isLiked
      ? currentLiked.filter((id) => id !== track.id)
      : [track.id, ...currentLiked];

    set((state) => ({
      tracksById: { ...state.tracksById, [track.id]: track },
      likedTrackIds: nextLiked,
    }));
    await setTrackLikedDb(track.id, !isLiked);
    return !isLiked;
  },

  likeAllTracks: async (tracks) => {
    await upsertTracks(tracks);
    const existing = new Set(get().likedTrackIds);
    for (const t of tracks) {
      if (!existing.has(t.id)) {
        existing.add(t.id);
        await setTrackLikedDb(t.id, true);
      }
    }
    get().registerTracks(tracks);
    set({ likedTrackIds: Array.from(existing) });
  },

  hideTrack: (trackId) => {
    set((state) => ({
      hiddenTrackIds: state.hiddenTrackIds.includes(trackId)
        ? state.hiddenTrackIds
        : [...state.hiddenTrackIds, trackId],
    }));
  },

  recordPlayed: async (track) => {
    await upsertTrack(track);
    await recordRecentlyPlayedDb(track.id);
    set((state) => {
      const filtered = state.recentlyPlayedIds.filter((id) => id !== track.id);
      return {
        tracksById: { ...state.tracksById, [track.id]: track },
        recentlyPlayedIds: [track.id, ...filtered].slice(0, 30),
      };
    });
  },

  createPlaylist: async (name, description) => {
    const now = Date.now();
    const playlist: Playlist = {
      id: `playlist:${now}`,
      name: name.trim() || 'My Playlist',
      description: description?.trim() || undefined,
      owner: 'You',
      trackIds: [],
      likesCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await savePlaylist(playlist);
    set((state) => ({ playlists: [playlist, ...state.playlists] }));
    return playlist;
  },

  updatePlaylist: async (id, name, description) => {
    const target = get().playlists.find((p) => p.id === id);
    if (!target) return;
    const updated: Playlist = {
      ...target,
      name: name.trim() || target.name,
      description: description?.trim(),
      updatedAt: Date.now(),
    };
    await savePlaylist(updated);
    set((state) => ({
      playlists: state.playlists.map((p) => (p.id === id ? updated : p)),
    }));
  },

  deletePlaylist: async (id) => {
    await removePlaylist(id);
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== id),
    }));
  },

  addTrackToPlaylist: async (playlistId, track) => {
    const target = get().playlists.find((p) => p.id === playlistId);
    if (!target) return;
    await upsertTrack(track);
    if (target.trackIds.includes(track.id)) return;

    const updated: Playlist = {
      ...target,
      trackIds: [...target.trackIds, track.id],
      updatedAt: Date.now(),
    };
    await savePlaylist(updated);
    set((state) => ({
      tracksById: { ...state.tracksById, [track.id]: track },
      playlists: state.playlists.map((p) => (p.id === playlistId ? updated : p)),
    }));
  },

  removeTrackFromPlaylist: async (playlistId, trackId) => {
    const target = get().playlists.find((p) => p.id === playlistId);
    if (!target) return;
    const updated: Playlist = {
      ...target,
      trackIds: target.trackIds.filter((id) => id !== trackId),
      updatedAt: Date.now(),
    };
    await savePlaylist(updated);
    set((state) => ({
      playlists: state.playlists.map((p) => (p.id === playlistId ? updated : p)),
    }));
  },

  importLocalMusic: async () => {
    const res = await importDeviceAudioFiles();
    if (res.imported.length > 0) {
      get().registerTracks(res.imported);
    }
    return res;
  },

  scanLocalMusic: async () => {
    const res = await scanAndroidDeviceAudio();
    if (res.tracks.length > 0) {
      get().registerTracks(res.tracks);
    }
    return { count: res.tracks.length, message: res.message };
  },

  addRecentSearch: async (item) => {
    const fullItem: RecentSearchItem = { ...item, searchedAt: Date.now() };
    await addRecentSearchDb(fullItem);
    set((state) => ({
      recentSearches: [
        fullItem,
        ...state.recentSearches.filter((r) => r.id !== fullItem.id),
      ].slice(0, 15),
    }));
  },

  clearRecentSearches: async () => {
    await clearRecentSearchesDb();
    set({ recentSearches: [] });
  },

  refreshTrending: async () => {
    const trending = await fetchRemoteTrending();
    if (trending.length > 0) {
      get().registerTracks(trending);
      set({ remoteTrending: trending });
    }
  },
}));
