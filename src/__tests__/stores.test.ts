import { audioService } from '@/services/audio/AudioService';
import * as db from '@/services/storage/database';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Track } from '@/types/music';

jest.mock('@/services/audio/AudioService', () => ({
  audioService: {
    initialize: jest.fn(() => Promise.resolve()),
    loadAndPlay: jest.fn(() => Promise.resolve()),
    play: jest.fn(() => Promise.resolve()),
    pause: jest.fn(() => Promise.resolve()),
    seekTo: jest.fn(() => Promise.resolve()),
    setVolume: jest.fn(() => Promise.resolve()),
    setPlaybackRate: jest.fn(() => Promise.resolve()),
    subscribe: jest.fn(() => jest.fn()),
    dispose: jest.fn(() => Promise.resolve()),
  },
}));

const TRACK_1: Track = {
  id: 'audius:t1',
  sourceId: 'audius',
  sourceTrackId: 't1',
  title: 'Track One',
  artist: 'Artist A',
  durationMs: 180000,
  streamUrl: 'https://example.com/1.mp3',
  isDownloadable: true,
};

const TRACK_2: Track = {
  id: 'archive:t2',
  sourceId: 'archive',
  sourceTrackId: 't2',
  title: 'Track Two',
  artist: 'Artist B',
  durationMs: 200000,
  streamUrl: 'https://example.com/2.mp3',
  isDownloadable: true,
};

const TRACK_LOCAL: Track = {
  id: 'local:t3',
  sourceId: 'local',
  sourceTrackId: 't3',
  title: 'Local Track',
  artist: 'Phone Artist',
  durationMs: 150000,
  localUri: 'file:///mock-documents/local_music/song.mp3',
  streamUrl: 'file:///mock-documents/local_music/song.mp3',
  isDownloadable: false,
};

describe('usePlayerStore & useLibraryStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.setState({
      settings: { ...db.DEFAULT_SETTINGS, offlineOnly: false },
      isHydrated: true,
    });
    useDownloadStore.setState({ downloads: {}, totalBytesUsed: 0 });
    useLibraryStore.setState({
      tracksById: {
        [TRACK_1.id]: TRACK_1,
        [TRACK_2.id]: TRACK_2,
        [TRACK_LOCAL.id]: TRACK_LOCAL,
      },
      playlists: [],
      likedTrackIds: [],
      recentlyPlayedIds: [],
    });
    usePlayerStore.setState({
      currentTrack: null,
      queue: [],
      currentIndex: 0,
      isPlaying: false,
      positionMs: 0,
      durationMs: 0,
      shuffle: false,
      repeatMode: 'off',
      playbackError: null,
    });
  });

  it('plays a track, advances next, rewinds on previous > 3s, and cycles repeat modes', async () => {
    await usePlayerStore.getState().playTrack(TRACK_1, [TRACK_1, TRACK_2], 'Test Queue');
    expect(usePlayerStore.getState().currentTrack?.id).toBe(TRACK_1.id);
    expect(audioService.loadAndPlay).toHaveBeenCalledWith(TRACK_1.streamUrl, TRACK_1);

    await usePlayerStore.getState().next();
    expect(usePlayerStore.getState().currentTrack?.id).toBe(TRACK_2.id);

    // When position > 3000ms, previous() seeks to 0 instead of switching tracks
    usePlayerStore.setState({ positionMs: 5000 });
    await usePlayerStore.getState().previous();
    expect(audioService.seekTo).toHaveBeenCalledWith(0);
    expect(usePlayerStore.getState().currentTrack?.id).toBe(TRACK_2.id);

    // When position <= 3000ms, previous() jumps back to TRACK_1
    usePlayerStore.setState({ positionMs: 1000 });
    await usePlayerStore.getState().previous();
    expect(usePlayerStore.getState().currentTrack?.id).toBe(TRACK_1.id);

    // Repeat mode cycles off -> all -> one -> off
    expect(usePlayerStore.getState().repeatMode).toBe('off');
    usePlayerStore.getState().cycleRepeatMode();
    expect(usePlayerStore.getState().repeatMode).toBe('all');
    usePlayerStore.getState().cycleRepeatMode();
    expect(usePlayerStore.getState().repeatMode).toBe('one');
    usePlayerStore.getState().cycleRepeatMode();
    expect(usePlayerStore.getState().repeatMode).toBe('off');
  });

  it('wraps around queue on next when repeatMode is all', async () => {
    await usePlayerStore.getState().playTrack(TRACK_2, [TRACK_1, TRACK_2], 'Loop');
    usePlayerStore.getState().cycleRepeatMode(); // 'all'

    await usePlayerStore.getState().next();
    expect(usePlayerStore.getState().currentTrack?.id).toBe(TRACK_1.id);
  });

  it('blocks non-downloaded remote streams in offlineOnly mode while allowing local tracks', async () => {
    useSettingsStore.setState({
      settings: { ...db.DEFAULT_SETTINGS, offlineOnly: true },
    });

    await usePlayerStore.getState().playTrack(TRACK_1, [TRACK_1]);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(usePlayerStore.getState().playbackError).toMatch(/offline/i);
    expect(audioService.loadAndPlay).not.toHaveBeenCalled();

    // Local device track plays cleanly in offlineOnly mode
    await usePlayerStore.getState().playTrack(TRACK_LOCAL, [TRACK_LOCAL]);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().playbackError).toBeNull();
    expect(audioService.loadAndPlay).toHaveBeenCalledWith(TRACK_LOCAL.localUri, TRACK_LOCAL);
  });

  it('performs optimistic liked songs toggle and playlist add/remove', async () => {
    const likedPromise = useLibraryStore.getState().toggleLike(TRACK_1);
    // Immediately updated optimistically before promise settles
    expect(useLibraryStore.getState().likedTrackIds).toContain(TRACK_1.id);
    expect(await likedPromise).toBe(true);

    await useLibraryStore.getState().toggleLike(TRACK_1);
    expect(useLibraryStore.getState().likedTrackIds).not.toContain(TRACK_1.id);

    const pl = await useLibraryStore.getState().createPlaylist('Roadtrip', 'CC tunes');
    await useLibraryStore.getState().addTrackToPlaylist(pl.id, TRACK_2);
    expect(
      useLibraryStore.getState().playlists.find((p) => p.id === pl.id)?.trackIds
    ).toEqual([TRACK_2.id]);

    await useLibraryStore.getState().removeTrackFromPlaylist(pl.id, TRACK_2.id);
    expect(
      useLibraryStore.getState().playlists.find((p) => p.id === pl.id)?.trackIds
    ).toEqual([]);
  });

  it('rolls back optimistic like toggle if SQLite persistence fails', async () => {
    const spy = jest.spyOn(db, 'setTrackLikedDb').mockRejectedValueOnce(new Error('SQLite full'));

    await expect(useLibraryStore.getState().toggleLike(TRACK_1)).rejects.toThrow('SQLite full');
    expect(useLibraryStore.getState().likedTrackIds).not.toContain(TRACK_1.id);
    spy.mockRestore();
  });
});
