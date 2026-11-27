import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SongTile } from '@/components/SongTile';
import { TrackArtwork } from '@/components/TrackArtwork';
import { SEEDED_ALBUMS } from '@/data/seedCatalog';
import { FontFamily, Palette, Shadows, Spacing } from '@/constants/theme';
import { isTrackDownloadable } from '@/services/sources/sourceRegistry';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme } from '@/store/useSettingsStore';

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const decodedId = id ? decodeURIComponent(id) : '';
  const album = useMemo(
    () => SEEDED_ALBUMS.find((a) => a.id === decodedId) ?? SEEDED_ALBUMS[0],
    [decodedId]
  );

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);

  const likedTrackIds = useLibraryStore((s) => s.likedTrackIds);
  const likeAllTracks = useLibraryStore((s) => s.likeAllTracks);

  const downloads = useDownloadStore((s) => s.downloads);
  const downloadTrack = useDownloadStore((s) => s.downloadTrack);

  const isAlbumPlaying =
    isPlaying && album.tracks.some((t) => t.id === currentTrack?.id);
  const allLiked = album.tracks.every((t) => likedTrackIds.includes(t.id));
  const allDownloaded = album.tracks.every(
    (t) => !isTrackDownloadable(t) || downloads[t.id]?.status === 'completed'
  );

  const handlePlayAlbum = async () => {
    if (isAlbumPlaying) {
      await togglePlayPause();
    } else if (album.tracks[0]) {
      await playTrack(album.tracks[0], album.tracks, album.title);
    }
  };

  const handleDownloadAlbum = async () => {
    let started = 0;
    for (const track of album.tracks) {
      if (isTrackDownloadable(track) && downloads[track.id]?.status !== 'completed') {
        started++;
        downloadTrack(track).catch(() => {});
      }
    }
    if (started === 0) {
      Alert.alert('Downloaded', 'All downloadable tracks in this album are already saved offline.');
    }
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[album.dominantColor || Palette.playerGradientTop, theme.background]}
        locations={[0, 1]}
        style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={Palette.white} />
        </Pressable>

        <View style={[styles.coverWrap, Shadows.artwork]}>
          <TrackArtwork
            artworkUrl={album.artworkUrl}
            artworkAsset={album.artworkAsset}
            dominantColor={album.dominantColor}
            size={232}
            borderRadius={2}
          />
        </View>

        <Text style={styles.albumTitle}>{album.title}</Text>

        <View style={styles.artistRow}>
          <TrackArtwork
            artworkUrl={album.artworkUrl}
            artworkAsset={album.artworkAsset}
            size={22}
            circular
          />
          <Text style={styles.artistName}>{album.artist}</Text>
        </View>

        <Text style={styles.metaLine}>
          Album · {album.year ?? 2024}
        </Text>

        <View style={styles.controlsRow}>
          <View style={styles.leftIcons}>
            <Pressable onPress={() => likeAllTracks(album.tracks)} hitSlop={10}>
              <Ionicons
                name={allLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={allLiked ? Palette.brandGreen : Palette.white}
              />
            </Pressable>
            <Pressable onPress={handleDownloadAlbum} hitSlop={10}>
              <Ionicons
                name={allDownloaded ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
                size={24}
                color={allDownloaded ? Palette.brandGreen : Palette.white}
              />
            </Pressable>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/album-options', params: { albumId: album.id } })
              }
              hitSlop={10}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color={Palette.white} />
            </Pressable>
          </View>

          <Pressable onPress={handlePlayAlbum} style={styles.playCircle}>
            <Ionicons
              name={isAlbumPlaying ? 'pause' : 'play'}
              size={26}
              color="#121212"
              style={!isAlbumPlaying ? { marginLeft: 2 } : undefined}
            />
          </Pressable>
        </View>
      </LinearGradient>

      {album.tracks.map((track) => (
        <SongTile
          key={track.id}
          track={track}
          isActive={currentTrack?.id === track.id}
          showArtwork={false}
          showDownloadAction
          downloadRecord={downloads[track.id]}
          onPress={() => playTrack(track, album.tracks, album.title)}
          onDownloadPress={() => downloadTrack(track).catch(() => {})}
          onMorePress={() =>
            router.push({ pathname: '/track-options', params: { trackId: track.id } })
          }
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  coverWrap: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  albumTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 25,
    color: Palette.white,
    letterSpacing: -0.4,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  artistName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13.5,
    color: Palette.white,
  },
  metaLine: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: Palette.mutedText,
    marginTop: 6,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  leftIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
