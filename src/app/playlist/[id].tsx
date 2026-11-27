import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DockedMiniPlayerFooter } from '@/components/DockedMiniPlayerFooter';
import { MusifyLogo } from '@/components/MusifyLogo';
import { PlaylistFormModal } from '@/components/PlaylistModal';
import { SongTile } from '@/components/SongTile';
import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Palette, Radii, Shadows, Spacing } from '@/constants/theme';
import { isTrackDownloadable } from '@/services/sources/sourceRegistry';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme } from '@/store/useSettingsStore';
import { formatDuration } from '@/utils/format';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const decodedId = id ? decodeURIComponent(id) : 'liked';
  const isLikedView = decodedId === 'liked';

  const tracksById = useLibraryStore((s) => s.tracksById);
  const playlists = useLibraryStore((s) => s.playlists);
  const likedTrackIds = useLibraryStore((s) => s.likedTrackIds);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);
  const likeAllTracks = useLibraryStore((s) => s.likeAllTracks);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);

  const downloads = useDownloadStore((s) => s.downloads);
  const downloadTrack = useDownloadStore((s) => s.downloadTrack);

  const [findQuery, setFindQuery] = useState('');
  const [sortByTitle, setSortByTitle] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const playlist = useMemo(
    () => playlists.find((p) => p.id === decodedId),
    [playlists, decodedId]
  );

  const rawTracks = useMemo(() => {
    const ids = isLikedView ? likedTrackIds : playlist?.trackIds ?? [];
    return ids.map((tid) => tracksById[tid]).filter(Boolean);
  }, [isLikedView, likedTrackIds, playlist, tracksById]);

  const displayedTracks = useMemo(() => {
    const q = findQuery.trim().toLowerCase();
    const filtered = q
      ? rawTracks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q)
        )
      : rawTracks;
    return sortByTitle
      ? [...filtered].sort((a, b) => a.title.localeCompare(b.title))
      : filtered;
  }, [rawTracks, findQuery, sortByTitle]);

  const title = isLikedView ? 'Liked Songs' : playlist?.name ?? 'Playlist';
  const description = isLikedView
    ? 'All your saved favorite tracks in one place.'
    : playlist?.description ?? 'Created on Musify';
  const owner = isLikedView ? 'You' : playlist?.owner ?? 'You';
  const totalMs = rawTracks.reduce((acc, t) => acc + (t.durationMs || 0), 0);
  const isPlaylistPlaying =
    isPlaying && rawTracks.some((t) => t.id === currentTrack?.id);

  const downloadableTracks = rawTracks.filter((t) => isTrackDownloadable(t));
  const hasDownloadable = downloadableTracks.length > 0;
  const allDownloaded =
    hasDownloadable &&
    downloadableTracks.every((t) => downloads[t.id]?.status === 'completed');
  const anyDownloading = downloadableTracks.some(
    (t) => downloads[t.id]?.status === 'downloading'
  );

  const handlePlay = async () => {
    if (isPlaylistPlaying) {
      await togglePlayPause();
    } else if (displayedTracks[0]) {
      await playTrack(displayedTracks[0], displayedTracks, title);
    }
  };

  const handlePlaylistMenu = () => {
    if (isLikedView || !playlist) return;
    Alert.alert(playlist.name, 'Manage playlist', [
      { text: 'Edit details', onPress: () => setShowEditModal(true) },
      {
        text: 'Delete playlist',
        style: 'destructive',
        onPress: async () => {
          await deletePlaylist(playlist.id);
          router.back();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDownloadAll = () => {
    const pending = downloadableTracks.filter(
      (t) => downloads[t.id]?.status !== 'completed'
    );
    if (pending.length === 0) {
      Alert.alert('Offline Ready', 'All downloadable songs in this playlist are saved offline.');
      return;
    }
    for (const t of pending) {
      downloadTrack(t).catch(() => {});
    }
  };

  const firstTrack = rawTracks[0];
  const gradientTop = isLikedView
    ? Palette.likedGradientStart
    : firstTrack?.dominantColor ?? '#285245';

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[gradientTop, theme.background]}
          locations={[0, 1]}
          style={[styles.headerGrad, { paddingTop: insets.top + 8 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={Palette.white} />
          </Pressable>

          <View style={styles.searchRow}>
            <View style={styles.findBox}>
              <Ionicons name="search" size={15} color={Palette.white} />
              <TextInput
                value={findQuery}
                onChangeText={setFindQuery}
                placeholder="Find in playlist"
                placeholderTextColor="rgba(255,255,255,0.72)"
                style={styles.findInput}
              />
            </View>
            <Pressable
              onPress={() => setSortByTitle((v) => !v)}
              style={[
                styles.sortBox,
                sortByTitle && { borderColor: Palette.brandGreen, borderWidth: 1 },
              ]}
            >
              <Text style={styles.sortText}>{sortByTitle ? 'A–Z' : 'Sort'}</Text>
            </Pressable>
          </View>

          <View style={[styles.coverWrap, Shadows.artwork]}>
            {isLikedView ? (
              <LinearGradient
                colors={[Palette.likedGradientStart, Palette.likedGradientEnd]}
                style={styles.likedCover}
              >
                <Ionicons name="heart" size={88} color={Palette.white} />
              </LinearGradient>
            ) : (
              <TrackArtwork
                artworkUrl={playlist?.artworkUrl ?? firstTrack?.artworkUrl}
                localArtworkUri={firstTrack?.localArtworkUri}
                dominantColor={gradientTop}
                size={236}
                borderRadius={4}
              />
            )}
          </View>

          <Text style={styles.plTitle}>{title}</Text>
          <Text style={styles.plDesc}>{description}</Text>

          <View style={styles.ownerRow}>
            <MusifyLogo size={20} circleColor={Palette.brandGreen} waveColor="#121212" />
            <Text style={styles.ownerText}>{owner}</Text>
          </View>

          <Text style={styles.statsText}>
            {rawTracks.length} song{rawTracks.length === 1 ? '' : 's'}
            {totalMs > 0 ? ` · ${formatDuration(totalMs)}` : ''}
          </Text>

          <View style={styles.controlsRow}>
            <View style={styles.leftIcons}>
              {!isLikedView && (
                <Pressable onPress={() => likeAllTracks(rawTracks)} hitSlop={10}>
                  <Ionicons name="heart-outline" size={24} color={Palette.white} />
                </Pressable>
              )}

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

              {!isLikedView && (
                <Pressable onPress={handlePlaylistMenu} hitSlop={10}>
                  <Ionicons name="ellipsis-horizontal" size={24} color={Palette.white} />
                </Pressable>
              )}
            </View>

            <View style={styles.rightPlayGroup}>
              <Pressable onPress={toggleShuffle} hitSlop={10} style={{ marginRight: 16 }}>
                <Ionicons
                  name="shuffle"
                  size={22}
                  color={shuffle ? Palette.brandGreen : Palette.mutedText}
                />
              </Pressable>
              <Pressable onPress={handlePlay} style={styles.playCircle}>
                <Ionicons
                  name={isPlaylistPlaying ? 'pause' : 'play'}
                  size={26}
                  color="#121212"
                  style={!isPlaylistPlaying ? { marginLeft: 2 } : undefined}
                />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {displayedTracks.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {findQuery
                ? `No songs matching “${findQuery}”.`
                : 'No songs here yet. Tap the heart on any track or add songs from Search.'}
            </Text>
          </View>
        ) : (
          displayedTracks.map((track) => (
            <SongTile
              key={track.id}
              track={track}
              isActive={currentTrack?.id === track.id}
              showSourceBadge
              showDownloadAction
              onPress={() => playTrack(track, displayedTracks, title)}
              onMorePress={() =>
                router.push({
                  pathname: '/track-options',
                  params: {
                    trackId: track.id,
                    playlistId: isLikedView ? '' : playlist?.id ?? '',
                  },
                })
              }
            />
          ))
        )}
      </ScrollView>

      <DockedMiniPlayerFooter />

      {playlist && (
        <PlaylistFormModal
          visible={showEditModal}
          initialPlaylist={playlist}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerGrad: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  findBox: {
    flex: 1,
    height: 38,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  findInput: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 13.5,
    color: Palette.white,
  },
  sortBox: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Palette.white,
  },
  coverWrap: {
    alignSelf: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  likedCover: {
    width: 230,
    height: 230,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Palette.white,
  },
  plDesc: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Palette.mutedText,
    marginTop: 4,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  ownerText: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Palette.white,
  },
  statsText: {
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
    gap: 14,
  },
  downloadAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  downloadAllText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Palette.white,
  },
  rightPlayGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
