import { create } from 'zustand';

import {
  importDeviceAudioFiles,
  scanDeviceAudio,
} from '@/services/sources/localSource';
import {
  fetchDiscoveryFeed,
  type DiscoveryFeed,
} from '@/services/sources/sourceRegistry';
import {
  addRecentSearchDb,
  clearRecentSearchesDb,
  getAllStoredTracks,
  getKvJson,
  getLikedTrackIds,
  getPlaylists,
  getRecentlyPlayedIds,
  getRecentSearchesDb,
  purgeLegacySeededData,
  recordRecentlyPlayedDb,
  removePlaylist,
  savePlaylist,
  setKvJson,
  setTrackLikedDb,
  upsertTrack,
  upsertTracks,
  type RecentSearchItem,
} from '@/services/storage/database';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Playlist, Track } from '@/types/music';

const CLEAN_V2_KEY = 'musify_clean_v2';

interface LibraryState {
  tracksById: Record<string, Track>;
  playlists: Playlist[];
  likedTrackIds: string[];
  recentlyPlayedIds: string[];
  discoveryFeed: DiscoveryFeed;
  isLoadingFeed: boolean;
  isScanningDevice: boolean;
  deviceScanMessage: string | null;
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
  rescanDeviceMusic: (promptPermission?: boolean) => Promise<{ count: number; message?: string }>;

  addRecentSearch: (item: Omit<RecentSearchItem, 'searchedAt'>) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
  refreshDiscovery: () => Promise<void>;
}

const EMPTY_FEED: DiscoveryFeed = {
  audiusTracks: [],
  jamendoTracks: [],
  archiveTracks: [],
  allTracks: [],
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracksById: {},
  playlists: [],
  likedTrackIds: [],
  recentlyPlayedIds: [],
  discoveryFeed: EMPTY_FEED,
  isLoadingFeed: false,
  isScanningDevice: false,
  deviceScanMessage: null,
  recentSearches: [],
  hiddenTrackIds: [],
  isHydrated: false,

  hydrate: async () => {
    const cleaned = await getKvJson<boolean>(CLEAN_V2_KEY);
    if (!cleaned) {
      await purgeLegacySeededData();
      await setKvJson(CLEAN_V2_KEY, true);
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
    for (const t of storedTracks) {
      tracksById[t.id] = t;
    }

    set({
      tracksById,
      playlists,
      likedTrackIds,
      recentlyPlayedIds,
      recentSearches,
      isHydrated: true,
    });

    // Automatically scan local device audio files on startup
    get()
      .rescanDeviceMusic(true)
      .catch(() => {});

    // Fetch live remote recommendations unless offlineOnly is active
    const offlineOnly = useSettingsStore.getState().settings.offlineOnly;
    if (!offlineOnly) {
      get()
        .refreshDiscovery()
        .catch(() => {});
    }
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
    const prevLiked = get().likedTrackIds;
    const isLiked = prevLiked.includes(track.id);
    const nextLiked = isLiked
      ? prevLiked.filter((id) => id !== track.id)
      : [track.id, ...prevLiked];

    // Optimistic UI update
    set((state) => ({
      tracksById: { ...state.tracksById, [track.id]: track },
      likedTrackIds: nextLiked,
    }));

    try {
      await upsertTrack(track);
      await setTrackLikedDb(track.id, !isLiked);
      return !isLiked;
    } catch (err) {
      // Roll back on persistence failure
      set({ likedTrackIds: prevLiked });
      throw err;
    }
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
    const prevPlaylists = get().playlists;
    const target = prevPlaylists.find((p) => p.id === playlistId);
    if (!target || target.trackIds.includes(track.id)) return;

    const updated: Playlist = {
      ...target,
      trackIds: [...target.trackIds, track.id],
      updatedAt: Date.now(),
    };

    // Optimistic UI update
    set((state) => ({
      tracksById: { ...state.tracksById, [track.id]: track },
      playlists: state.playlists.map((p) => (p.id === playlistId ? updated : p)),
    }));

    try {
      await upsertTrack(track);
      await savePlaylist(updated);
    } catch (err) {
      set({ playlists: prevPlaylists });
      throw err;
    }
  },

  removeTrackFromPlaylist: async (playlistId, trackId) => {
    const prevPlaylists = get().playlists;
    const target = prevPlaylists.find((p) => p.id === playlistId);
    if (!target) return;

    const updated: Playlist = {
      ...target,
      trackIds: target.trackIds.filter((id) => id !== trackId),
      updatedAt: Date.now(),
    };

    // Optimistic UI update
    set((state) => ({
      playlists: state.playlists.map((p) => (p.id === playlistId ? updated : p)),
    }));

    try {
      await savePlaylist(updated);
    } catch (err) {
      set({ playlists: prevPlaylists });
      throw err;
    }
  },

  importLocalMusic: async () => {
    const res = await importDeviceAudioFiles();
    if (res.imported.length > 0) {
      get().registerTracks(res.imported);
    }
    return res;
  },

  rescanDeviceMusic: async (promptPermission = true) => {
    set({ isScanningDevice: true });
    try {
      const res = await scanDeviceAudio(promptPermission);
      if (res.tracks.length > 0) {
        get().registerTracks(res.tracks);
      }
      set({ deviceScanMessage: res.message ?? null });
      return { count: res.tracks.length, message: res.message };
    } finally {
      set({ isScanningDevice: false });
    }
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

  refreshDiscovery: async () => {
    set({ isLoadingFeed: true });
    try {
      const feed = await fetchDiscoveryFeed();
      if (feed.allTracks.length > 0) {
        get().registerTracks(feed.allTracks);
      }
      set({ discoveryFeed: feed });
    } finally {
      set({ isLoadingFeed: false });
    }
  },
}));
