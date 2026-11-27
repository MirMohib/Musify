import { create } from 'zustand';

import { SEEDED_TRACKS } from '@/data/seedCatalog';
import { audioService } from '@/services/audio/AudioService';
import { resolvePlayableUri } from '@/services/sources/sourceRegistry';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { RepeatMode, Track } from '@/types/music';

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  currentIndex: number;
  contextTitle: string;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMs: number;
  durationMs: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  activeDeviceName: string;
  sleepTimerEndsAt: number | null;
  playbackError: string | null;
  initialized: boolean;

  initAudio: () => void;
  playTrack: (track: Track, queue?: Track[], contextTitle?: string) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
  clearUpcomingQueue: () => void;
  setActiveDevice: (name: string) => void;
  setSleepTimer: (minutes: number | null) => void;
  clearError: () => void;
}

let sleepTimerHandle: ReturnType<typeof setTimeout> | null = null;
let audioUnsubscribe: (() => void) | null = null;

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: SEEDED_TRACKS[0],
  queue: SEEDED_TRACKS,
  currentIndex: 0,
  contextTitle: '1 (Remastered)',
  isPlaying: false,
  isBuffering: false,
  positionMs: 0,
  durationMs: SEEDED_TRACKS[0].durationMs,
  shuffle: false,
  repeatMode: 'off',
  activeDeviceName: 'This Phone',
  sleepTimerEndsAt: null,
  playbackError: null,
  initialized: false,

  initAudio: () => {
    if (get().initialized) return;
    audioService.initialize().catch(() => {});
    audioUnsubscribe?.();
    audioUnsubscribe = audioService.subscribe((status) => {
      const current = get().currentTrack;
      set({
        isPlaying: status.isPlaying,
        isBuffering: status.isBuffering,
        positionMs: status.positionMs,
        durationMs: status.durationMs > 0 ? status.durationMs : current?.durationMs ?? 0,
        playbackError: status.error,
      });

      if (status.didJustFinish) {
        const { repeatMode } = get();
        if (repeatMode === 'one' && current) {
          get().seekTo(0).then(() => audioService.play());
        } else {
          get().next();
        }
      }
    });
    set({ initialized: true });
  },

  playTrack: async (track, queue, contextTitle) => {
    get().initAudio();
    const activeQueue = queue && queue.length > 0 ? queue : [track];
    const foundIndex = activeQueue.findIndex((t) => t.id === track.id);
    const nextIndex = foundIndex >= 0 ? foundIndex : 0;

    set({
      currentTrack: track,
      queue: activeQueue,
      currentIndex: nextIndex,
      contextTitle: contextTitle ?? track.album ?? track.artist,
      positionMs: 0,
      durationMs: track.durationMs,
      isBuffering: true,
      playbackError: null,
    });

    try {
      const settings = useSettingsStore.getState().settings;
      const downloadRec = useDownloadStore.getState().downloads[track.id];
      const playableUri = await resolvePlayableUri(track, settings, downloadRec);
      await audioService.loadAndPlay(playableUri, track);
      useLibraryStore.getState().recordPlayed(track).catch(() => {});
      set({ isPlaying: true, isBuffering: false });
    } catch (err) {
      set({
        isPlaying: false,
        isBuffering: false,
        playbackError: err instanceof Error ? err.message : 'Unable to play this track.',
      });
    }
  },

  togglePlayPause: async () => {
    get().initAudio();
    const { isPlaying, currentTrack, queue, contextTitle, positionMs } = get();
    if (!currentTrack) return;

    // If initial seeded track was never loaded into the native player yet
    if (positionMs === 0 && !isPlaying) {
      await get().playTrack(currentTrack, queue, contextTitle);
      return;
    }

    if (isPlaying) {
      await audioService.pause();
      set({ isPlaying: false });
    } else {
      await audioService.play();
      set({ isPlaying: true });
    }
  },

  next: async () => {
    const { queue, currentIndex, shuffle, repeatMode, contextTitle } = get();
    if (queue.length === 0) return;

    let nextIndex = currentIndex + 1;
    if (shuffle && queue.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * queue.length);
      } while (nextIndex === currentIndex);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        await audioService.pause();
        await audioService.seekTo(0);
        set({ isPlaying: false, positionMs: 0 });
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      await get().playTrack(nextTrack, queue, contextTitle);
    }
  },

  previous: async () => {
    const { queue, currentIndex, positionMs, contextTitle } = get();
    if (queue.length === 0) return;

    if (positionMs > 3000) {
      await get().seekTo(0);
      return;
    }

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      await get().playTrack(prevTrack, queue, contextTitle);
    }
  },

  seekTo: async (positionMs) => {
    set({ positionMs });
    await audioService.seekTo(positionMs);
  },

  toggleShuffle: () => {
    set((state) => ({ shuffle: !state.shuffle }));
  },

  cycleRepeatMode: () => {
    set((state) => {
      const order: RepeatMode[] = ['off', 'all', 'one'];
      const next = order[(order.indexOf(state.repeatMode) + 1) % order.length];
      return { repeatMode: next };
    });
  },

  addToQueue: (track) => {
    useLibraryStore.getState().registerTracks([track]);
    set((state) => {
      if (state.queue.length === 0) {
        return { queue: [track], currentTrack: track, currentIndex: 0 };
      }
      return { queue: [...state.queue, track] };
    });
  },

  removeFromQueue: (index) => {
    set((state) => {
      if (index === state.currentIndex || index < 0 || index >= state.queue.length) {
        return state;
      }
      const nextQueue = state.queue.filter((_, i) => i !== index);
      const nextCurrentIndex =
        index < state.currentIndex ? state.currentIndex - 1 : state.currentIndex;
      return { queue: nextQueue, currentIndex: nextCurrentIndex };
    });
  },

  moveQueueItem: (fromIndex, toIndex) => {
    set((state) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.queue.length ||
        toIndex >= state.queue.length
      ) {
        return state;
      }
      const nextQueue = [...state.queue];
      const [moved] = nextQueue.splice(fromIndex, 1);
      nextQueue.splice(toIndex, 0, moved);

      const currentTrackId = state.currentTrack?.id;
      const nextCurrentIndex = currentTrackId
        ? nextQueue.findIndex((t) => t.id === currentTrackId)
        : state.currentIndex;

      return {
        queue: nextQueue,
        currentIndex: nextCurrentIndex >= 0 ? nextCurrentIndex : 0,
      };
    });
  },

  clearUpcomingQueue: () => {
    set((state) => {
      if (!state.currentTrack) return { queue: [], currentIndex: 0 };
      return { queue: [state.currentTrack], currentIndex: 0 };
    });
  },

  setActiveDevice: (name) => {
    set({ activeDeviceName: name });
  },

  setSleepTimer: (minutes) => {
    if (sleepTimerHandle) {
      clearTimeout(sleepTimerHandle);
      sleepTimerHandle = null;
    }
    if (!minutes || minutes <= 0) {
      set({ sleepTimerEndsAt: null });
      return;
    }
    const endsAt = Date.now() + minutes * 60 * 1000;
    set({ sleepTimerEndsAt: endsAt });
    sleepTimerHandle = setTimeout(() => {
      audioService.pause().catch(() => {});
      set({ isPlaying: false, sleepTimerEndsAt: null });
    }, minutes * 60 * 1000);
  },

  clearError: () => set({ playbackError: null }),
}));
