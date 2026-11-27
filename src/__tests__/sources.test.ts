import * as MediaLibrary from 'expo-media-library';

import { mapArchiveDoc } from '@/services/sources/archiveSource';
import { mapAudiusTrack } from '@/services/sources/audiusSource';
import { parseFilenameMetadata, scanDeviceAudio } from '@/services/sources/localSource';

describe('music source mappers & local scanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Audius mapper', () => {
    it('normalizes full Audius track metadata and download flag', () => {
      const track = mapAudiusTrack(
        {
          id: 'abc123',
          title: 'Neon Skyline',
          duration: 215.4,
          genre: 'Electronic',
          is_downloadable: true,
          release_date: '2025-04-12',
          artwork: {
            '150x150': 'https://img/150.jpg',
            '480x480': 'https://img/480.jpg',
          },
          user: { id: 'u9', name: 'Synth Artist' },
        },
        'https://discovery.audius.co'
      );

      expect(track.id).toBe('audius:abc123');
      expect(track.title).toBe('Neon Skyline');
      expect(track.artist).toBe('Synth Artist');
      expect(track.durationMs).toBe(215400);
      expect(track.year).toBe(2025);
      expect(track.artworkUrl).toBe('https://img/480.jpg');
      expect(track.isDownloadable).toBe(true);
      expect(track.streamUrl).toBe(
        'https://discovery.audius.co/v1/tracks/abc123/stream?app_name=Musify'
      );
    });

    it('gracefully handles missing artwork, user, and release date', () => {
      const track = mapAudiusTrack(
        {
          id: 'xyz',
          title: '',
        },
        'https://discovery.audius.co'
      );

      expect(track.title).toBe('Untitled');
      expect(track.artist).toBe('Audius Artist');
      expect(track.artworkUrl).toBeUndefined();
      expect(track.durationMs).toBe(0);
      expect(track.isDownloadable).toBe(false);
    });
  });

  describe('Internet Archive mapper', () => {
    it('normalizes array creators and marks tracks downloadable', () => {
      const track = mapArchiveDoc({
        identifier: 'cc-jazz-01',
        title: 'Midnight Quartet',
        creator: ['Blue Note Ensemble', 'Archive'],
        year: '1962',
        licenseurl: 'https://creativecommons.org/licenses/by/4.0/',
      });

      expect(track.id).toBe('archive:cc-jazz-01');
      expect(track.artist).toBe('Blue Note Ensemble');
      expect(track.year).toBe(1962);
      expect(track.isDownloadable).toBe(true);
      expect(track.artworkUrl).toBe('https://archive.org/services/img/cc-jazz-01');
    });

    it('falls back cleanly when title or creator are missing', () => {
      const track = mapArchiveDoc({ identifier: 'unknown-item' });
      expect(track.title).toBe('unknown-item');
      expect(track.artist).toBe('Internet Archive');
      expect(track.isDownloadable).toBe(true);
    });
  });

  describe('Local filename parser & automatic MediaLibrary scanner', () => {
    it('parses Artist - Title and Artist - Album - Title filenames', () => {
      expect(parseFilenameMetadata('Miles Davis - Blue in Green.mp3')).toEqual({
        artist: 'Miles Davis',
        title: 'Blue in Green',
      });
      expect(parseFilenameMetadata('Daft Punk - Discovery - Harder Better.flac')).toEqual({
        artist: 'Daft Punk',
        album: 'Discovery',
        title: 'Harder Better',
      });
      expect(parseFilenameMetadata('VoiceMemo01.m4a')).toEqual({
        artist: 'Device Audio',
        title: 'VoiceMemo01',
      });
    });

    it('scans supported audio assets and skips unsupported extensions', async () => {
      const mockAssets = [
        {
          id: '101',
          getFilename: jest.fn(async () => 'Nujabes - Feather.mp3'),
          getDuration: jest.fn(async () => 176),
          getUri: jest.fn(async () => 'file:///music/feather.mp3'),
          getAlbums: jest.fn(async () => [{ getTitle: jest.fn(async () => 'Modal Soul') }]),
        },
        {
          id: '102',
          getFilename: jest.fn(async () => 'cover.jpg'),
          getDuration: jest.fn(async () => 0),
          getUri: jest.fn(async () => 'file:///music/cover.jpg'),
          getAlbums: jest.fn(async () => []),
        },
      ];

      (MediaLibrary.Query as unknown as jest.Mock).mockImplementationOnce(() => ({
        eq: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exe: jest.fn(async () => mockAssets),
      }));

      const res = await scanDeviceAudio(true);
      expect(res.permissionGranted).toBe(true);
      expect(res.newlyIndexedCount).toBe(1);
    });

    it('returns permissionGranted=false with message when permission denied', async () => {
      (MediaLibrary.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });

      const res = await scanDeviceAudio(true);
      expect(res.permissionGranted).toBe(false);
      expect(res.message).toMatch(/permission was denied/i);
    });
  });
});
