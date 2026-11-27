import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DockedMiniPlayerFooter } from '@/components/DockedMiniPlayerFooter';
import { SongTile } from '@/components/SongTile';
import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Palette, Radii, Shadows, Spacing } from '@/constants/theme';
import { isTrackDownloadable, searchAllSources } from '@/services/sources/sourceRegistry';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';
import type { Track } from '@/types/music';

export default function AlbumScreen() {
  const { id, title: paramTitle, artist: paramArtist } = useLocalSearchParams<{
    id: string;
    title?: string;
    artist?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const offlineOnly = useSettingsStore((s) => s.settings.offlineOnly);

  const decodedId = id ? decodeURIComponent(id) : '';
  const decodedTitle = paramTitle ? decodeURIComponent(paramTitle) : '';
  const decodedArtist = paramArtist ? decodeURIComponent(paramArtist) : '';

  const tracksById = useLibraryStore((s) => s.tracksById);
  const registerTracks = useLibraryStore((s) => s.registerTracks);
  const likedTrackIds = useLibraryStore((s) => s.likedTrackIds);
  const likeAllTracks = useLibraryStore((s) => s.likeAllTracks);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);

  const downloads = useDownloadStore((s) => s.downloads);
  const downloadTrack = useDownloadStore((s) => s.downloadTrack);

  const [remoteTracks, setRemoteTracks] = useState<Track[]>([]);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);

  const storedMatches = useMemo(() => {
    const all = Object.values(tracksById);
    return all.filter(
      (t) =>
        t.albumId === decodedId ||
        (decodedTitle && t.album?.toLowerCase() === decodedTitle.toLowerCase()) ||
        t.album === decodedId
    );
  }, [tracksById, decodedId, decodedTitle]);

  const queryTerm = decodedTitle || decodedArtist;
  const shouldFetch = storedMatches.length === 0 && !offlineOnly && Boolean(queryTerm);
  const loading = shouldFetch && resolvedKey !== decodedId;

  useEffect(() => {
    if (!shouldFetch || !queryTerm) return;
    let cancelled = false;
    searchAllSources(queryTerm, false)
      .then((out) => {
        if (!cancelled && out.tracks.length > 0) {
          registerTracks(out.tracks);
          setRemoteTracks(out.tracks);
        }
      })
      .finally(() => {
        if (!cancelled) setResolvedKey(decodedId);
      });
    return () => {
      cancelled = true;
    };
  }, [shouldFetch, queryTerm, decodedId, registerTracks]);

  const tracks = storedMatches.length > 0 ? storedMatches : remoteTracks;
  const firstTrack = tracks[0];
  const albumTitle = firstTrack?.album || decodedTitle || 'Collection';
  const artistName = firstTrack?.artist || decodedArtist || 'Various Artists';
  const artistId = firstTrack?.artistId || artistName;
  const dominantColor = firstTrack?.dominantColor || Palette.playerGradientTop;

  const isAlbumPlaying = isPlaying && tracks.some((t) => t.id === currentTrack?.id);
  const allLiked = tracks.length > 0 && tracks.every((t) => likedTrackIds.includes(t.id));

  const downloadableTracks = tracks.filter((t) => isTrackDownloadable(t));
  const hasDownloadable = downloadableTracks.length > 0;
  const allDownloaded =
    hasDownloadable &&
    downloadableTracks.every((t) => downloads[t.id]?.status === 'completed');
  const anyDownloading = downloadableTracks.some(
    (t) => downloads[t.id]?.status === 'downloading'
  );

  const handlePlayAlbum = async () => {
    if (isAlbumPlaying) {
      await togglePlayPause();
    } else if (tracks[0]) {
      await playTrack(tracks[0], tracks, albumTitle);
    }
  };

  const handleDownloadAll = async () => {
    const pending = downloadableTracks.filter(
      (t) => downloads[t.id]?.status !== 'completed'
    );
    if (pending.length === 0) {
      Alert.alert('Offline Ready', 'All downloadable tracks in this collection are saved.');
      return;
    }
    for (const track of pending) {
      downloadTrack(track).catch(() => {});
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[dominantColor, theme.background]}
          locations={[0, 1]}
          style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={Palette.white} />
          </Pressable>

          <View style={[styles.coverWrap, Shadows.artwork]}>
            <TrackArtwork
              artworkUrl={firstTrack?.artworkUrl}
              localArtworkUri={firstTrack?.localArtworkUri}
              dominantColor={dominantColor}
              size={228}
              borderRadius={4}
            />
          </View>

          <Text style={styles.albumTitle}>{albumTitle}</Text>

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/artist/[id]',
                params: { id: artistId, name: artistName },
              })
            }
            style={styles.artistRow}
          >
            <TrackArtwork
              artworkUrl={firstTrack?.artworkUrl}
              localArtworkUri={firstTrack?.localArtworkUri}
              size={22}
              circular
            />
            <Text style={styles.artistName}>{artistName}</Text>
            <Ionicons name="chevron-forward" size={14} color={Palette.mutedText} />
          </Pressable>

          <Text style={styles.metaLine}>
            Album · {firstTrack?.year ?? 'Collection'} · {tracks.length} track
            {tracks.length === 1 ? '' : 's'}
          </Text>

          <View style={styles.controlsRow}>
            <View style={styles.leftIcons}>
              <Pressable onPress={() => likeAllTracks(tracks)} hitSlop={10}>
                <Ionicons
                  name={allLiked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={allLiked ? Palette.brandGreen : Palette.white}
                />
              </Pressable>

              {hasDownloadable && (
                <Pressable onPress={handleDownloadAll} style={styles.downloadAllBtn}>
                  {anyDownloading ? (
                    <ActivityIndicator size="small" color={Palette.brandGreen} />
                  ) : (
                    <Ionicons
                      name={allDownloaded ? 'checkmark-circle' : 'arrow-down-circle-outline'}
                      size={20}
                      color={allDownloaded ? Palette.brandGreen : Palette.white}
                    />
                  )}
                  <Text
                    style={[
                      styles.downloadAllText,
                      allDownloaded && { color: Palette.brandGreen },
                    ]}
                  >
                    {allDownloaded ? 'Downloaded' : anyDownloading ? 'Downloading' : 'Download All'}
                  </Text>
                </Pressable>
              )}

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/album-options',
                    params: { albumId: decodedId, title: albumTitle, artist: artistName },
                  })
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

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Palette.brandGreen} />
          </View>
        ) : tracks.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No tracks found for this album.
          </Text>
        ) : (
          tracks.map((track) => (
            <SongTile
              key={track.id}
              track={track}
              isActive={currentTrack?.id === track.id}
              showArtwork={false}
              showDownloadAction
              onPress={() => playTrack(track, tracks, albumTitle)}
              onMorePress={() =>
                router.push({ pathname: '/track-options', params: { trackId: track.id } })
              }
            />
          ))
        )}
      </ScrollView>

      <DockedMiniPlayerFooter />
    </View>
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
    fontSize: 24,
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
    gap: 16,
  },
  downloadAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  downloadAllText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Palette.white,
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    padding: Spacing.xxl,
  },
});
