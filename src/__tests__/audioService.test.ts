import * as ExpoAudio from 'expo-audio';

import { audioService } from '@/services/audio/AudioService';
import type { Track } from '@/types/music';

describe('AudioService lock-screen metadata', () => {
  const mockPlayer = (
    ExpoAudio as unknown as {
      __mockPlayer: {
        replace: jest.Mock;
        setActiveForLockScreen: jest.Mock;
        play: jest.Mock;
      };
    }
  ).__mockPlayer;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers localArtworkUri over remote artworkUrl for offline lock-screen controls', async () => {
    const track: Track = {
      id: 'archive:offline-art',
      sourceId: 'archive',
      sourceTrackId: 'offline-art',
      title: 'Offline Track',
      artist: 'Archive Artist',
      album: 'Archive Album',
      durationMs: 120000,
      artworkUrl: 'https://archive.org/services/img/offline-art',
      localArtworkUri: 'file:///mock-documents/musify_artwork/archive_offline-art.jpg',
      isDownloadable: true,
    };

    await audioService.loadAndPlay('file:///mock-documents/musify_downloads/track.mp3', track);

    expect(mockPlayer.replace).toHaveBeenCalledWith({
      uri: 'file:///mock-documents/musify_downloads/track.mp3',
      name: 'Offline Track',
    });
    expect(mockPlayer.setActiveForLockScreen).toHaveBeenCalledWith(true, {
      title: 'Offline Track',
      artist: 'Archive Artist',
      albumTitle: 'Archive Album',
      artworkUrl: 'file:///mock-documents/musify_artwork/archive_offline-art.jpg',
    });
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it('falls back to artworkUrl when localArtworkUri is unset', async () => {
    const track: Track = {
      id: 'audius:online-art',
      sourceId: 'audius',
      sourceTrackId: 'online-art',
      title: 'Online Track',
      artist: 'Audius Artist',
      album: 'Audius Album',
      durationMs: 90000,
      artworkUrl: 'https://img.audius.co/cover.jpg',
      isDownloadable: false,
    };

    await audioService.loadAndPlay('https://stream.audius.co/online-art', track);

    expect(mockPlayer.setActiveForLockScreen).toHaveBeenCalledWith(true, {
      title: 'Online Track',
      artist: 'Audius Artist',
      albumTitle: 'Audius Album',
      artworkUrl: 'https://img.audius.co/cover.jpg',
    });
  });
});
