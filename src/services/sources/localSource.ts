/**
 * Local device music source provider.
 * - Automatically scans device audio files (.mp3, .m4a, .wav, .flac, etc.)
 *   using expo-media-library and indexes metadata into SQLite.
 * - Also supports manual cross-platform file import via expo-document-picker
 *   (especially useful on iOS where Music/Files live outside PHPhotoLibrary).
 */

import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

import type { MusicSourceProvider } from '@/services/sources/types';
import { getLocalTracks, upsertTrack, upsertTracks } from '@/services/storage/database';
import type { Track } from '@/types/music';

const LOCAL_MUSIC_DIR_NAME = 'local_music';
const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg', '.opus'];

function getLocalMusicDirectory(): Directory {
  const dir = new Directory(Paths.document, LOCAL_MUSIC_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function isSupportedAudioFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUPPORTED_AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function parseFilenameMetadata(filename: string): {
  title: string;
  artist: string;
  album?: string;
} {
  const withoutExt = filename.replace(/\.[^/.]+$/, '').trim();
  const dashSplit = withoutExt.split(/\s+-\s+/);
  if (dashSplit.length >= 3) {
    return {
      artist: dashSplit[0].trim() || 'Local Artist',
      album: dashSplit[1].trim() || undefined,
      title: dashSplit.slice(2).join(' - ').trim() || withoutExt,
    };
  }
  if (dashSplit.length === 2) {
    return {
      artist: dashSplit[0].trim() || 'Local Artist',
      title: dashSplit[1].trim() || withoutExt,
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
      // Fallback: reference asset URI directly if copy is unsupported for this content URI
    }

    const finalUri = destFile.exists ? destFile.uri : asset.uri;
    const { title, artist, album } = parseFilenameMetadata(asset.name || 'Imported Audio');
    const sourceTrackId = `import_${safeName}`;

    const track: Track = {
      id: `local:${sourceTrackId}`,
      sourceId: 'local',
      sourceTrackId,
      title,
      artist,
      artistId: `local_artist:${encodeURIComponent(artist)}`,
      album: album || 'Imported Files',
      albumId: `local_album:${encodeURIComponent(album || 'Imported Files')}`,
      durationMs: 0,
      localUri: finalUri,
      streamUrl: finalUri,
      isDownloadable: false,
      license: 'Local Device File',
    };

    await upsertTrack(track);
    imported.push(track);
  }

  return { imported, canceled: false };
}

export interface DeviceScanResult {
  tracks: Track[];
  permissionGranted: boolean;
  newlyIndexedCount: number;
  message?: string;
}

/**
 * Automatically scans the device media library for audio files (.mp3, .m4a, .wav, .flac, etc.)
 * and persists their metadata into SQLite.
 */
export async function scanDeviceAudio(promptForPermission = true): Promise<DeviceScanResult> {
  try {
    const existingPermission =
      Platform.OS === 'android'
        ? await MediaLibrary.getPermissionsAsync(false, ['audio'])
        : await MediaLibrary.getPermissionsAsync(false);

    let granted = existingPermission.granted;

    if (!granted && promptForPermission) {
      const requested =
        Platform.OS === 'android'
          ? await MediaLibrary.requestPermissionsAsync(false, ['audio'])
          : await MediaLibrary.requestPermissionsAsync(false);
      granted = requested.granted;
    }

    if (!granted) {
      const existingLocal = await getLocalTracks();
      return {
        tracks: existingLocal,
        permissionGranted: false,
        newlyIndexedCount: 0,
        message: promptForPermission
          ? 'Media library permission was denied. Grant audio access or use "Import Local Music".'
          : undefined,
      };
    }

    const media = await new MediaLibrary.Query()
      .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.AUDIO)
      .orderBy({ key: MediaLibrary.AssetField.MODIFICATION_TIME, ascending: false })
      .limit(300)
      .exe();

    const scanned: Track[] = [];
    for (const asset of media) {
      const [filename, durationSec, uri, albums] = await Promise.all([
        asset.getFilename().catch(() => 'Audio Track.mp3'),
        asset.getDuration().catch(() => 0),
        asset.getUri().catch(() => asset.id),
        asset.getAlbums().catch(() => []),
      ]);

      if (filename && filename.includes('.') && !isSupportedAudioFilename(filename)) {
        continue;
      }

      let albumName: string | undefined;
      if (albums.length > 0) {
        albumName = await albums[0].getTitle().catch(() => undefined);
      }

      const parsed = parseFilenameMetadata(filename);
      const resolvedAlbum = albumName || parsed.album || 'Device Music';

      scanned.push({
        id: `local:ml_${asset.id}`,
        sourceId: 'local',
        sourceTrackId: `ml_${asset.id}`,
        title: parsed.title,
        artist: parsed.artist,
        artistId: `local_artist:${encodeURIComponent(parsed.artist)}`,
        album: resolvedAlbum,
        albumId: `local_album:${encodeURIComponent(resolvedAlbum)}`,
        durationMs: Math.round((durationSec || 0) * 1000),
        localUri: uri,
        streamUrl: uri,
        isDownloadable: false,
        license: 'Local Device Media',
      });
    }

    if (scanned.length > 0) {
      await upsertTracks(scanned);
    }

    const allLocal = await getLocalTracks();
    return {
      tracks: allLocal,
      permissionGranted: true,
      newlyIndexedCount: scanned.length,
      message:
        scanned.length === 0 && Platform.OS === 'ios'
          ? 'No audio assets found in iOS Media Library. Use "Import Local Music" to load MP3/M4A/WAV files from the Files app.'
          : undefined,
    };
  } catch (err) {
    const existingLocal = await getLocalTracks();
    return {
      tracks: existingLocal,
      permissionGranted: false,
      newlyIndexedCount: 0,
      message:
        err instanceof Error
          ? err.message
          : 'Automatic audio scanning may require an EAS development build. You can still use "Import Local Music".',
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
    return false;
  },
};
