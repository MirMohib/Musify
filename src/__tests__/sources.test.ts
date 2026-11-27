import * as MediaLibrary from 'expo-media-library';

import { mapArchiveDoc } from '@/services/sources/archiveSource';
import { mapAudiusTrack } from '@/services/sources/audiusSource';
import { customApiSourceProvider, mapCustomTrack } from '@/services/sources/customApiSource';
import { hearthisSourceProvider, mapHearThisTrack } from '@/services/sources/hearthisSource';
import { parseFilenameMetadata, scanDeviceAudio } from '@/services/sources/localSource';
import { mapRadioStation, radioSourceProvider } from '@/services/sources/radioSource';
import { DEFAULT_SETTINGS } from '@/services/storage/database';
import { useSettingsStore } from '@/store/useSettingsStore';

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

  describe('HearThis.at mapper & provider', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('maps downloadable tracks to download_url and respects non-downloadable flag', () => {
      const downloadable = mapHearThisTrack({
        id: '777',
        title: 'Deep House Set',
        duration: '360',
        genre: 'Deep House',
        downloadable: '1',
        download_url: 'https://hearthis.at/dl/777.mp3',
        stream_url: 'https://hearthis.at/stream/777',
        artwork_url: 'https://hearthis.at/art/777.jpg',
        user: { id: 'u1', username: 'DJ Horizon' },
      });
      expect(downloadable.id).toBe('hearthis:777');
      expect(downloadable.isDownloadable).toBe(true);
      expect(downloadable.streamUrl).toBe('https://hearthis.at/dl/777.mp3');
      expect(downloadable.durationMs).toBe(360000);

      const streamOnly = mapHearThisTrack({
        id: '778',
        title: 'Radio Rip',
        downloadable: 0,
        stream_url: 'https://hearthis.at/stream/778',
      });
      expect(streamOnly.isDownloadable).toBe(false);
      expect(streamOnly.streamUrl).toBe('https://hearthis.at/stream/778');
    });

    it('searches HearThis.at search endpoint', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => [
          {
            id: '900',
            title: 'Ambient Mix',
            stream_url: 'https://hearthis.at/stream/900',
            user: { username: 'AmbientLab' },
          },
        ],
      })) as unknown as typeof fetch;

      const results = await hearthisSourceProvider.search('ambient', 5);
      expect(results).toHaveLength(1);
      expect(results[0].sourceId).toBe('hearthis');
      expect(results[0].artist).toBe('AmbientLab');
    });
  });

  describe('Radio Browser mapper & provider', () => {
    it('maps stations as live stream-only tracks with isDownloadable=false', () => {
      const station = mapRadioStation({
        stationuuid: 'st-001',
        name: 'SomaFM Groove Salad',
        url: 'http://ice.somafm.com/groovesalad',
        url_resolved: 'https://ice2.somafm.com/groovesalad-128-mp3',
        favicon: 'https://somafm.com/img/groovesalad.png',
        country: 'USA',
        tags: 'ambient, chillout',
      });

      expect(station.id).toBe('radio:st-001');
      expect(station.sourceId).toBe('radio');
      expect(station.artist).toBe('USA · ambient');
      expect(station.streamUrl).toBe('https://ice2.somafm.com/groovesalad-128-mp3');
      expect(station.isDownloadable).toBe(false);
      expect(radioSourceProvider.isDownloadable(station)).toBe(false);
    });
  });

  describe('Custom Audio API provider', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS } });
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('silently skips search without throwing or fetching when customApiUrl is unset', async () => {
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy as unknown as typeof fetch;

      expect(customApiSourceProvider.isConfigured()).toBe(false);
      const tracks = await customApiSourceProvider.search('lofi');
      expect(tracks).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('maps search payloads and resolves /stream/{id} or direct streamUrl when configured', async () => {
      useSettingsStore.setState({
        settings: {
          ...DEFAULT_SETTINGS,
          customApiUrl: 'https://media.local/api/',
          customApiDownloadable: true,
        },
      });

      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          results: [
            { id: '42', title: 'Home Demo', artist: 'Me', duration: 95 },
            {
              id: '43',
              title: 'Direct FLV/MP3',
              streamUrl: 'https://cdn.local/audio/43.mp3',
              downloadable: false,
            },
          ],
        }),
      })) as unknown as typeof fetch;

      expect(customApiSourceProvider.isConfigured()).toBe(true);
      const tracks = await customApiSourceProvider.search('demo');
      expect(global.fetch).toHaveBeenCalledWith('https://media.local/api/search?q=demo&limit=15');
      expect(tracks).toHaveLength(2);
      expect(tracks[0].streamUrl).toBe('https://media.local/api/stream/42');
      expect(tracks[0].durationMs).toBe(95000);
      expect(tracks[0].isDownloadable).toBe(true);
      expect(tracks[1].streamUrl).toBe('https://cdn.local/audio/43.mp3');
      expect(tracks[1].isDownloadable).toBe(false);

      const fallbackMapped = mapCustomTrack({ id: '99' }, 'https://media.local/api', false);
      expect(fallbackMapped.isDownloadable).toBe(false);
      await expect(customApiSourceProvider.getStreamUrl(tracks[0])).resolves.toBe(
        'https://media.local/api/stream/42'
      );
    });
  });
});
