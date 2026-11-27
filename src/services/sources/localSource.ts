/**
 * Local device music source provider.
 * - Cross-platform (iOS & Android): imports audio files via expo-document-picker
 *   into persistent app storage so URIs remain playable across launches.
 * - Android: optionally scans device audio library via expo-media-library.
 */

import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

import { getLocalTracks, upsertTrack, upsertTracks } from '@/services/storage/database';
import type { MusicSourceProvider } from '@/services/sources/types';
import type { Track } from '@/types/music';

const LOCAL_MUSIC_DIR_NAME = 'local_music';

function getLocalMusicDirectory(): Directory {
  const dir = new Directory(Paths.document, LOCAL_MUSIC_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function parseFilenameMetadata(filename: string): { title: string; artist: string } {
  const withoutExt = filename.replace(/\.[^/.]+$/, '').trim();
  const dashSplit = withoutExt.split(/\s+-\s+/);
  if (dashSplit.length >= 2) {
    return {
      artist: dashSplit[0].trim() || 'Local Artist',
      title: dashSplit.slice(1).join(' - ').trim() || withoutExt,
    };
  }
  return {
    title: withoutExt || 'Untitled Track',
    artist: 'Device Audio',
  };
}

export async function importDeviceAudioFiles(): Promise<{
  imported: Track[];
  canceled: boolean;
}> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['audio/*', 'public.audio'],
    multiple: true,
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) {
    return { imported: [], canceled: true };
  }

  const destDir = getLocalMusicDirectory();
  const imported: Track[] = [];

  for (const asset of result.assets) {
    const safeName = `${Date.now()}_${(asset.name || 'track.mp3').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const sourceFile = new File(asset.uri);
    const destFile = new File(destDir, safeName);

    try {
      sourceFile.copy(destFile);
    } catch {
      // Fallback: if copy fails (e.g. content URI edge case), reference asset URI directly
    }

    const finalUri = destFile.exists ? destFile.uri : asset.uri;
    const { title, artist } = parseFilenameMetadata(asset.name || 'Imported Audio');
    const sourceTrackId = `import_${safeName}`;

    const track: Track = {
      id: `local:${sourceTrackId}`,
      sourceId: 'local',
      sourceTrackId,
      title,
      artist,
      album: 'Imported Files',
      durationMs: 0,
      localUri: finalUri,
      streamUrl: finalUri,
      isDownloadable: false,
      license: 'Local Device File',
      dominantColor: '#264653',
    };

    await upsertTrack(track);
    imported.push(track);
  }

  return { imported, canceled: false };
}

export async function scanAndroidDeviceAudio(): Promise<{
  tracks: Track[];
  permissionGranted: boolean;
  message?: string;
}> {
  if (Platform.OS !== 'android') {
    return {
      tracks: await getLocalTracks(),
      permissionGranted: true,
      message: 'On iOS, use "Import Audio Files" to pick music from the Files app.',
    };
  }

  try {
    const permission = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
    if (!permission.granted) {
      return {
        tracks: [],
        permissionGranted: false,
        message:
          'Audio permission was denied. Grant access in system settings or use "Import Audio Files".',
      };
    }

    const media = await new MediaLibrary.Query()
      .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.AUDIO)
      .orderBy({ key: MediaLibrary.AssetField.MODIFICATION_TIME, ascending: false })
      .limit(150)
      .exe();

    const scanned: Track[] = await Promise.all(
      media.map(async (asset) => {
        const [filename, durationSec, uri] = await Promise.all([
          asset.getFilename().catch(() => 'Audio Track'),
          asset.getDuration().catch(() => 0),
          asset.getUri().catch(() => asset.id),
        ]);
        const { title, artist } = parseFilenameMetadata(filename);
        return {
          id: `local:ml_${asset.id}`,
          sourceId: 'local',
          sourceTrackId: `ml_${asset.id}`,
          title,
          artist,
          album: 'Device Music',
          durationMs: Math.round((durationSec || 0) * 1000),
          localUri: uri,
          streamUrl: uri,
          isDownloadable: false,
          license: 'Local Device Media',
          dominantColor: '#2A4D3E',
        };
      })
    );

    await upsertTracks(scanned);
    return { tracks: scanned, permissionGranted: true };
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : 'Media library audio scan requires an EAS development build on Android 13+. Use "Import Audio Files" in Expo Go.';
    return {
      tracks: await getLocalTracks(),
      permissionGranted: false,
      message: msg,
    };
  }
}

export const localSourceProvider: MusicSourceProvider = {
  id: 'local',
  label: 'Device Music',
  supportsDownload: false,

  isConfigured() {
    return true;
  },

  async search(query: string, limit = 25): Promise<Track[]> {
    const tracks = await getLocalTracks();
    const q = query.trim().toLowerCase();
    if (!q) return tracks.slice(0, limit);
    return tracks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.album ?? '').toLowerCase().includes(q)
      )
      .slice(0, limit);
  },

  async getTrack(sourceTrackId: string): Promise<Track | null> {
    const tracks = await getLocalTracks();
    return tracks.find((t) => t.sourceTrackId === sourceTrackId) ?? null;
  },

  async getStreamUrl(track: Track): Promise<string | null> {
    return track.localUri ?? track.streamUrl ?? null;
  },

  isDownloadable(): boolean {
    return false; // Already stored locally on the device
  },
};
