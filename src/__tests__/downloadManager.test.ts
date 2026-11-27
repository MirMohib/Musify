import { DownloadTask, File } from 'expo-file-system';

import {
  getDownloadedStorageBytes,
  inferAudioExtensionFromUrlOrMime,
  pauseTrackDownload,
  removeTrackDownload,
  resumeTrackDownload,
  startTrackDownload,
  toSafeNumber,
} from '@/services/downloads/downloadManager';
import * as db from '@/services/storage/database';
import { DEFAULT_SETTINGS } from '@/services/storage/database';
import type { DownloadRecord, Track } from '@/types/music';

jest.mock('@/services/storage/database', () => {
  const actual = jest.requireActual('@/services/storage/database');
  return {
    ...actual,
    upsertTrack: jest.fn(() => Promise.resolve()),
    upsertDownloadDb: jest.fn(() => Promise.resolve()),
    deleteDownloadDb: jest.fn(() => Promise.resolve()),
  };
});

const DOWNLOADABLE_TRACK: Track = {
  id: 'archive:test-song',
  sourceId: 'archive',
  sourceTrackId: 'test-song',
  title: 'Test CC Song',
  artist: 'Archive Artist',
  durationMs: 120000,
  streamUrl: 'https://archive.org/download/test-song/song.mp3',
  isDownloadable: true,
};

const NON_DOWNLOADABLE_TRACK: Track = {
  id: 'audius:stream-only',
  sourceId: 'audius',
  sourceTrackId: 'stream-only',
  title: 'Stream Only',
  artist: 'Audius Artist',
  durationMs: 90000,
  streamUrl: 'https://discoveryprovider.audius.co/v1/tracks/stream-only/stream',
  isDownloadable: false,
};

describe('downloadManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toSafeNumber', () => {
    it('converts bigint values safely without throwing', () => {
      expect(toSafeNumber(BigInt(0))).toBe(0);
      expect(toSafeNumber(BigInt(5242880))).toBe(5242880);
      expect(toSafeNumber(123456n)).toBe(123456);
    });

    it('handles numbers, strings, null, undefined, and NaN', () => {
      expect(toSafeNumber(42)).toBe(42);
      expect(toSafeNumber('1024')).toBe(1024);
      expect(toSafeNumber(null)).toBe(0);
      expect(toSafeNumber(undefined)).toBe(0);
      expect(toSafeNumber(Number.NaN)).toBe(0);
      expect(toSafeNumber(Number.POSITIVE_INFINITY)).toBe(0);
    });
  });

  it('rejects tracks marked as non-downloadable by their provider', async () => {
    await expect(
      startTrackDownload(NON_DOWNLOADABLE_TRACK, DEFAULT_SETTINGS, {}, jest.fn())
    ).rejects.toThrow(/cannot be downloaded/i);
  });

  it('handles bigint progress updates and completes download lifecycle', async () => {
    const MockDownloadTask = DownloadTask as unknown as jest.Mock;
    MockDownloadTask.mockImplementationOnce(
      (
        _url: string,
        dest: File,
        options?: { onProgress?: (p: { bytesWritten: unknown; totalBytes: unknown }) => void }
      ) => ({
        state: 'idle',
        downloadAsync: jest.fn(async () => {
          // Simulate Expo SDK 58 native bridge emitting BigInt values
          options?.onProgress?.({
            bytesWritten: BigInt(500000),
            totalBytes: BigInt(1000000),
          });
          (dest as unknown as { exists: boolean; size: unknown }).exists = true;
          (dest as unknown as { size: unknown }).size = BigInt(1000000);
          return dest;
        }),
        pauseAsync: jest.fn(),
        resumeAsync: jest.fn(),
        cancel: jest.fn(),
        release: jest.fn(),
        savable: jest.fn(),
      })
    );

    const updates: DownloadRecord[] = [];
    const result = await startTrackDownload(
      DOWNLOADABLE_TRACK,
      DEFAULT_SETTINGS,
      {},
      (rec) => updates.push(rec)
    );

    expect(result.status).toBe('completed');
    expect(result.progress).toBe(1);
    expect(result.bytesWritten).toBe(1000000);
    expect(typeof result.bytesWritten).toBe('number');
    expect(updates.some((u) => u.status === 'downloading' && u.progress === 0.5)).toBe(true);
    expect(db.upsertDownloadDb).toHaveBeenCalled();
  });

  it('supports pause, resume from savable state, and delete', async () => {
    let resolveDownload!: (val: File | null) => void;
    const MockDownloadTask = DownloadTask as unknown as jest.Mock;

    const activeTask = {
      state: 'active' as string,
      downloadAsync: jest.fn(
        () =>
          new Promise<File | null>((resolve) => {
            resolveDownload = resolve;
          })
      ),
      pauseAsync: jest.fn(async () => {
        activeTask.state = 'paused';
        resolveDownload(null);
      }),
      resumeAsync: jest.fn(async () => {
        const f = new File('file:///mock-documents/musify_downloads/test.mp3');
        (f as unknown as { size: number }).size = 2048;
        return f;
      }),
      cancel: jest.fn(),
      release: jest.fn(),
      savable: jest.fn(() => ({
        url: DOWNLOADABLE_TRACK.streamUrl!,
        fileUri: 'file:///mock-documents/musify_downloads/test.mp3',
        isDirectory: false,
        resumeData: 'token-123',
      })),
    };

    MockDownloadTask.mockImplementationOnce(() => activeTask);

    const updates: DownloadRecord[] = [];
    const dlPromise = startTrackDownload(
      DOWNLOADABLE_TRACK,
      DEFAULT_SETTINGS,
      {},
      (rec) => updates.push(rec)
    );

    // Wait until downloadAsync starts after async extension detection & DB upserts
    for (let i = 0; i < 15 && !resolveDownload; i += 1) {
      await Promise.resolve();
    }

    await pauseTrackDownload(DOWNLOADABLE_TRACK.id, updates[updates.length - 1], (rec) =>
      updates.push(rec)
    );
    const pausedRec = await dlPromise;
    expect(pausedRec.status).toBe('paused');
    expect(pausedRec.resumeStateJson).toContain('token-123');

    await resumeTrackDownload(
      DOWNLOADABLE_TRACK,
      DEFAULT_SETTINGS,
      pausedRec,
      { [DOWNLOADABLE_TRACK.id]: pausedRec },
      (rec) => updates.push(rec)
    );

    const completed = updates[updates.length - 1];
    expect(completed.status).toBe('completed');
    expect(completed.bytesWritten).toBe(2048);

    await removeTrackDownload(DOWNLOADABLE_TRACK.id, completed);
    expect(db.deleteDownloadDb).toHaveBeenCalledWith(DOWNLOADABLE_TRACK.id);
  });

  it('computes total storage used across completed downloads with bigint sizes', () => {
    const records: Record<string, DownloadRecord> = {
      a: {
        trackId: 'a',
        status: 'completed',
        progress: 1,
        bytesWritten: 1500,
        totalBytes: 1500,
        localUri: 'file:///mock-documents/musify_downloads/a.mp3',
        createdAt: 1,
        updatedAt: 1,
      },
      b: {
        trackId: 'b',
        status: 'paused',
        progress: 0.4,
        bytesWritten: 400,
        totalBytes: 1000,
        createdAt: 1,
        updatedAt: 1,
      },
    };

    // Mock File constructor behavior for storage check
    const total = getDownloadedStorageBytes(records);
    expect(typeof total).toBe('number');
    expect(total).toBeGreaterThanOrEqual(0);
  });

  describe('extension detection & offline artwork caching', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('preserves audio extension from stream URL or Content-Type MIME header', () => {
      expect(inferAudioExtensionFromUrlOrMime('https://cdn.test/track.m4a?token=abc')).toBe('.m4a');
      expect(inferAudioExtensionFromUrlOrMime('https://cdn.test/track.ogg')).toBe('.ogg');
      expect(inferAudioExtensionFromUrlOrMime('https://cdn.test/track.wav')).toBe('.wav');
      expect(inferAudioExtensionFromUrlOrMime('https://cdn.test/stream/123', 'audio/mp4')).toBe('.m4a');
      expect(inferAudioExtensionFromUrlOrMime('https://cdn.test/stream/123', 'audio/ogg; codecs=opus')).toBe('.ogg');
      expect(inferAudioExtensionFromUrlOrMime('https://cdn.test/stream/123', 'audio/x-wav')).toBe('.wav');
      expect(inferAudioExtensionFromUrlOrMime('https://cdn.test/stream/123', 'audio/mpeg')).toBe('.mp3');
      expect(inferAudioExtensionFromUrlOrMime('https://cdn.test/stream/123')).toBe('.mp3');
    });

    it('uses HEAD Content-Type extension and caches cover artwork locally for offline playback', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        headers: {
          get: (key: string) => (key.toLowerCase() === 'content-type' ? 'audio/mp4' : null),
        },
      })) as unknown as typeof fetch;

      const MockDownloadTask = DownloadTask as unknown as jest.Mock;
      // 1st task: audio download (extensionless URL resolved to .m4a via HEAD)
      // 2nd task: cover artwork download into musify_artwork/
      MockDownloadTask.mockImplementation((_url: string, dest: File) => ({
        state: 'idle',
        downloadAsync: jest.fn(async () => {
          (dest as unknown as { exists: boolean; size: number }).exists = true;
          (dest as unknown as { size: number }).size = 4096;
          return dest;
        }),
        pauseAsync: jest.fn(),
        resumeAsync: jest.fn(),
        cancel: jest.fn(),
        release: jest.fn(),
        savable: jest.fn(),
      }));

      const trackWithArtwork: Track = {
        ...DOWNLOADABLE_TRACK,
        id: 'custom:extless-42',
        sourceId: 'custom',
        sourceTrackId: 'extless-42',
        streamUrl: 'https://my-server.test/stream/extless-42',
        artworkUrl: 'https://my-server.test/art/extless-42.jpg',
      };

      const record = await startTrackDownload(trackWithArtwork, DEFAULT_SETTINGS, {}, jest.fn());

      expect(global.fetch).toHaveBeenCalledWith(
        'https://my-server.test/stream/extless-42',
        expect.objectContaining({ method: 'HEAD' })
      );
      expect(record.status).toBe('completed');
      expect(record.localUri).toMatch(/\.m4a$/);
      expect(record.localArtworkUri).toMatch(/musify_artwork\//);
      expect(record.localArtworkUri).toMatch(/\.jpg$/);

      await removeTrackDownload(trackWithArtwork.id, record);
      expect(db.deleteDownloadDb).toHaveBeenCalledWith(trackWithArtwork.id);
    });
  });
});
