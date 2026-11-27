import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaylistCard } from '@/components/PlaylistCard';
import { SongTile } from '@/components/SongTile';
import { FigmaAssets } from '@/constants/figmaAssets';
import { SEEDED_ALBUMS, SEEDED_ARTISTS } from '@/data/seedCatalog';
import { FontFamily, Palette, Spacing } from '@/constants/theme';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme } from '@/store/useSettingsStore';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const tracksById = useLibraryStore((s) => s.tracksById);
  const playlists = useLibraryStore((s) => s.playlists);
  const recentlyPlayedIds = useLibraryStore((s) => s.recentlyPlayedIds);
  const remoteTrending = useLibraryStore((s) => s.remoteTrending);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const downloads = useDownloadStore((s) => s.downloads);
  const downloadTrack = useDownloadStore((s) => s.downloadTrack);

  const recentTracks = useMemo(
    () => recentlyPlayedIds.map((id) => tracksById[id]).filter(Boolean),
    [recentlyPlayedIds, tracksById]
  );

  const editorPlaylists = useMemo(
    () => playlists.filter((p) => ['playlist:front-left', 'playlist:top-songs', 'playlist:roadtrip'].includes(p.id)),
    [playlists]
  );

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.backgroundHome }]}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: 28,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header row matching Figma Home 1:346 */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Recently played</Text>
        <View style={styles.headerIcons}>
          <Pressable
            onPress={() => router.push('/(tabs)/downloads')}
            hitSlop={10}
            accessibilityLabel="Downloads and updates"
          >
            <Ionicons name="notifications-outline" size={23} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/queue')}
            hitSlop={10}
            accessibilityLabel="Listening history and queue"
          >
            <Ionicons name="time-outline" size={23} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/settings')}
            hitSlop={10}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={23} color={theme.text} />
          </Pressable>
        </View>
      </View>

      {/* Recently played horizontal shelf (105x105 cards, square albums + circular artists) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        <PlaylistCard
          title={SEEDED_ALBUMS[0].title}
          artworkAsset={SEEDED_ALBUMS[0].artworkAsset}
          size={106}
          onPress={() => router.push(`/album/${encodeURIComponent(SEEDED_ALBUMS[0].id)}`)}
        />
        <PlaylistCard
          title={SEEDED_ARTISTS[0].name}
          artworkAsset={SEEDED_ARTISTS[0].artworkAsset}
          size={106}
          circular
          onPress={() => router.push(`/artist/${encodeURIComponent(SEEDED_ARTISTS[0].id)}`)}
        />
        <PlaylistCard
          title={SEEDED_ARTISTS[1].name}
          artworkAsset={SEEDED_ARTISTS[1].artworkAsset}
          size={106}
          circular
          onPress={() => router.push(`/artist/${encodeURIComponent(SEEDED_ARTISTS[1].id)}`)}
        />
        <PlaylistCard
          title={SEEDED_ALBUMS[1].title}
          artworkAsset={SEEDED_ALBUMS[1].artworkAsset}
          size={106}
          onPress={() => router.push(`/album/${encodeURIComponent(SEEDED_ALBUMS[1].id)}`)}
        />
        {recentTracks.slice(0, 4).map((track) => (
          <PlaylistCard
            key={`recent-${track.id}`}
            title={track.title}
            artworkUrl={track.artworkUrl}
            artworkAsset={track.artworkAsset}
            dominantColor={track.dominantColor}
            size={106}
            onPress={() => playTrack(track, recentTracks, 'Recently played')}
          />
        ))}
      </ScrollView>

      {/* Review Spotlight matching Figma "#SPOTIFYWRAPPED / Your 2021 in review" */}
      <View style={styles.reviewHeader}>
        <Image source={FigmaAssets.wrappedBadge} style={styles.reviewBadge} contentFit="cover" />
        <View style={styles.reviewTextCol}>
          <Text style={[styles.reviewTag, { color: theme.textMuted }]}>#MUSIFYWRAPPED</Text>
          <Text style={[styles.reviewTitle, { color: theme.text }]}>Your Year in Review</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        <PlaylistCard
          title="Your Top Songs"
          artworkAsset={FigmaAssets.topSongs}
          size={154}
          onPress={() => router.push('/playlist/playlist:top-songs')}
        />
        <PlaylistCard
          title="Your Artists Revealed"
          artworkAsset={FigmaAssets.artistsRevealed}
          size={154}
          onPress={() => router.push('/playlist/liked')}
        />
      </ScrollView>

      {/* Editor's picks */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Editor’s picks</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        <PlaylistCard
          title="Hot Indie & Rap"
          subtitle="Ed Sheeran, Big Sean, Juice WRLD, Post Malone"
          artworkAsset={FigmaAssets.editors1}
          size={154}
          onPress={() => router.push('/playlist/playlist:shazam')}
        />
        <PlaylistCard
          title="Front Left"
          subtitle="Mitski, Tame Impala, Glass Animals, Charli XCX"
          artworkAsset={FigmaAssets.editors2}
          size={154}
          onPress={() => router.push('/playlist/playlist:front-left')}
        />
        <PlaylistCard
          title="Late Night Vibes"
          subtitle="No Rome, FKA twigs, Troye Sivan"
          artworkAsset={FigmaAssets.editors3}
          size={154}
          onPress={() =>
            router.push(
              `/playlist/${encodeURIComponent(editorPlaylists[2]?.id ?? 'playlist:roadtrip')}`
            )
          }
        />
      </ScrollView>

      {/* Live Trending from Audius & Jamendo */}
      {remoteTrending.length > 0 && (
        <View style={styles.trendingSection}>
          <View style={styles.trendingHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 0, marginBottom: 0 }]}>
              Trending on Audius &amp; Jamendo
            </Text>
            <Text style={styles.liveTag}>LIVE</Text>
          </View>
          {remoteTrending.slice(0, 6).map((track) => (
            <SongTile
              key={track.id}
              track={track}
              isActive={currentTrack?.id === track.id}
              showSourceBadge
              showDownloadAction
              downloadRecord={downloads[track.id]}
              onPress={() => playTrack(track, remoteTrending, 'Trending')}
              onDownloadPress={() => downloadTrack(track).catch(() => {})}
              onMorePress={() =>
                router.push({ pathname: '/track-options', params: { trackId: track.id } })
              }
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  horizontalList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    gap: 12,
  },
  reviewBadge: {
    width: 58,
    height: 58,
    borderRadius: 2,
  },
  reviewTextCol: {
    flex: 1,
  },
  reviewTag: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  reviewTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 24,
    letterSpacing: -0.6,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 23,
    letterSpacing: -0.5,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  trendingSection: {
    marginTop: Spacing.xl,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  liveTag: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#121212',
    backgroundColor: Palette.brandGreen,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
