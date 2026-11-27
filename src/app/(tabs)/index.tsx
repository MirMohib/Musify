import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaylistCard } from '@/components/PlaylistCard';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { HomeFeedSkeleton } from '@/components/SkeletonLoader';
import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';
import type { Track } from '@/types/music';

type HomeFilter = 'all' | 'music' | 'radio' | 'offline';

const HOME_FILTERS: { id: HomeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'music', label: 'Music' },
  { id: 'radio', label: 'Radio' },
  { id: 'offline', label: 'Offline' },
];

interface QuickTileItem {
  key: string;
  title: string;
  artworkUrl?: string;
  localArtworkUri?: string;
  artworkAsset?: number;
  dominantColor?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconBg?: string;
  isLiked?: boolean;
  onPress: () => void;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const offlineOnly = useSettingsStore((s) => s.settings.offlineOnly);
  const openProfileDrawer = useSettingsStore((s) => s.openProfileDrawer);

  const tracksById = useLibraryStore((s) => s.tracksById);
  const playlists = useLibraryStore((s) => s.playlists);
  const recentlyPlayedIds = useLibraryStore((s) => s.recentlyPlayedIds);
  const discoveryFeed = useLibraryStore((s) => s.discoveryFeed);
  const isLoadingFeed = useLibraryStore((s) => s.isLoadingFeed);
  const isScanningDevice = useLibraryStore((s) => s.isScanningDevice);
  const refreshDiscovery = useLibraryStore((s) => s.refreshDiscovery);
  const rescanDeviceMusic = useLibraryStore((s) => s.rescanDeviceMusic);

  const downloads = useDownloadStore((s) => s.downloads);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const [activeFilter, setActiveFilter] = useState<HomeFilter>(
    offlineOnly ? 'offline' : 'all'
  );

  const recentTracks = useMemo(
    () => recentlyPlayedIds.map((id) => tracksById[id]).filter(Boolean),
    [recentlyPlayedIds, tracksById]
  );

  const localTracks = useMemo(
    () => Object.values(tracksById).filter((t) => t.sourceId === 'local'),
    [tracksById]
  );

  const downloadedTracks = useMemo(
    () =>
      Object.values(downloads)
        .filter((d) => d.status === 'completed')
        .map((d) => tracksById[d.trackId])
        .filter(Boolean),
    [downloads, tracksById]
  );

  const offlinePool = useMemo(
    () => [...downloadedTracks, ...localTracks],
    [downloadedTracks, localTracks]
  );

  const musicTrending = useMemo(
    () => [...discoveryFeed.audiusTracks, ...discoveryFeed.hearthisTracks],
    [discoveryFeed.audiusTracks, discoveryFeed.hearthisTracks]
  );

  const ccTracks = useMemo(
    () => [...discoveryFeed.jamendoTracks, ...discoveryFeed.archiveTracks],
    [discoveryFeed.jamendoTracks, discoveryFeed.archiveTracks]
  );

  // Up to 8 quick-access tiles (2x4 grid) dynamically built from real user data
  const quickTiles = useMemo<QuickTileItem[]>(() => {
    const items: QuickTileItem[] = [
      {
        key: 'liked',
        title: 'Liked Songs',
        isLiked: true,
        onPress: () => router.push('/playlist/liked'),
      },
    ];

    for (const pl of playlists.slice(0, 4)) {
      const firstTrack = pl.trackIds[0] ? tracksById[pl.trackIds[0]] : undefined;
      items.push({
        key: `pl-${pl.id}`,
        title: pl.name,
        artworkUrl: pl.artworkUrl ?? firstTrack?.artworkUrl,
        localArtworkUri: firstTrack?.localArtworkUri,
        artworkAsset: pl.artworkAsset ?? firstTrack?.artworkAsset,
        dominantColor: firstTrack?.dominantColor,
        iconName: 'musical-notes',
        iconBg: theme.surfaceElevated,
        onPress: () => router.push(`/playlist/${encodeURIComponent(pl.id)}`),
      });
    }

    items.push({
      key: 'downloads',
      title: 'Downloads',
      iconName: 'cloud-done',
      iconBg: Palette.episodesBg,
      onPress: () => router.push('/downloads'),
    });

    items.push({
      key: 'device',
      title: 'Device Music',
      iconName: 'phone-portrait',
      iconBg: theme.surfaceElevated,
      onPress: () =>
        router.push({ pathname: '/(tabs)/library', params: { filter: 'device' } }),
    });

    for (const t of recentTracks) {
      if (items.length >= 8) break;
      items.push({
        key: `recent-tile-${t.id}`,
        title: t.title,
        artworkUrl: t.artworkUrl,
        localArtworkUri: t.localArtworkUri,
        artworkAsset: t.artworkAsset,
        dominantColor: t.dominantColor,
        iconName: 'musical-note',
        iconBg: theme.surfaceElevated,
        onPress: () => playTrack(t, recentTracks, 'Jump back in'),
      });
    }

    return items.slice(0, 8);
  }, [playlists, tracksById, recentTracks, theme.surfaceElevated, router, playTrack]);

  // Unique featured artists from live & local catalog
  const featuredArtists = useMemo(() => {
    const map = new Map<string, { id: string; name: string; artworkUrl?: string; color?: string }>();
    const pool = [...recentTracks, ...discoveryFeed.allTracks, ...localTracks];
    for (const t of pool) {
      if (!t.artist || map.has(t.artist.toLowerCase())) continue;
      map.set(t.artist.toLowerCase(), {
        id: t.artistId || t.artist,
        name: t.artist,
        artworkUrl: t.localArtworkUri || t.artworkUrl,
        color: t.dominantColor,
      });
      if (map.size >= 10) break;
    }
    return Array.from(map.values());
  }, [recentTracks, discoveryFeed.allTracks, localTracks]);

  const handleRefresh = async () => {
    await Promise.all([
      rescanDeviceMusic(false),
      offlineOnly ? Promise.resolve() : refreshDiscovery(),
    ]);
  };

  const renderCardShelf = (
    title: string,
    tracks: Track[],
    contextTitle: string,
    showLiveIndicator = false
  ) => {
    if (tracks.length === 0) return null;
    return (
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
          {showLiveIndicator && isLoadingFeed && (
            <ActivityIndicator size="small" color={Palette.brandGreen} />
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {tracks.slice(0, 12).map((track) => (
            <PlaylistCard
              key={`${contextTitle}-${track.id}`}
              title={track.title}
              subtitle={track.artist}
              artworkUrl={track.artworkUrl}
              localArtworkUri={track.localArtworkUri}
              artworkAsset={track.artworkAsset}
              dominantColor={track.dominantColor}
              size={150}
              onPress={() => playTrack(track, tracks, contextTitle)}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  const effectiveFilter: HomeFilter = offlineOnly ? 'offline' : activeFilter;
  const showMusic = effectiveFilter === 'all' || effectiveFilter === 'music';
  const showRadio = effectiveFilter === 'all' || effectiveFilter === 'radio';
  const showOffline = effectiveFilter === 'all' || effectiveFilter === 'offline';

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.backgroundHome }]}
      contentContainerStyle={{
        paddingTop: insets.top + 10,
        paddingBottom: 28,
      }}
      refreshControl={
        <RefreshControl
          refreshing={isLoadingFeed || isScanningDevice}
          onRefresh={handleRefresh}
          tintColor={Palette.brandGreen}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar: Profile Avatar + Filter Pills (matching Spotify Home) */}
      <View style={styles.topBar}>
        <ProfileAvatar size={34} onPress={openProfileDrawer} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {HOME_FILTERS.map((f) => {
            const active = effectiveFilter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setActiveFilter(f.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? Palette.brandGreen : theme.surfaceElevated,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: active ? '#121212' : theme.text },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 2x4 Compact Quick Access Grid */}
      <View style={styles.quickGrid}>
        {quickTiles.map((tile) => (
          <Pressable
            key={tile.key}
            onPress={tile.onPress}
            style={({ pressed }) => [
              styles.quickTile,
              { backgroundColor: theme.surfaceElevated },
              pressed && { opacity: 0.78 },
            ]}
          >
            {tile.isLiked ? (
              <LinearGradient
                colors={[Palette.likedGradientStart, Palette.likedGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickThumb}
              >
                <Ionicons name="heart" size={20} color="#FFFFFF" />
              </LinearGradient>
            ) : tile.artworkUrl || tile.localArtworkUri || tile.artworkAsset ? (
              <TrackArtwork
                artworkUrl={tile.artworkUrl}
                localArtworkUri={tile.localArtworkUri}
                artworkAsset={tile.artworkAsset}
                dominantColor={tile.dominantColor}
                size={54}
                borderRadius={0}
              />
            ) : (
              <View style={[styles.quickThumb, { backgroundColor: tile.iconBg ?? theme.surface }]}>
                <Ionicons name={tile.iconName ?? 'musical-notes'} size={20} color="#FFFFFF" />
              </View>
            )}

            <View style={styles.quickTitleWrap}>
              <Text style={[styles.quickTitle, { color: theme.text }]} numberOfLines={2}>
                {tile.title}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Loading skeleton while initial remote feed fetches */}
      {!offlineOnly && showMusic && isLoadingFeed && discoveryFeed.allTracks.length === 0 && (
        <HomeFeedSkeleton />
      )}

      {/* Horizontal Shelves */}
      {showMusic && renderCardShelf('Trending Now', musicTrending, 'Trending Now', true)}

      {showMusic && renderCardShelf('Jump back in', recentTracks, 'Jump back in')}

      {showMusic && renderCardShelf('Free & Downloadable (CC)', ccTracks, 'Free Creative Commons')}

      {showRadio && renderCardShelf('Live Global Radio', discoveryFeed.radioTracks, 'Live Radio')}

      {showOffline && (
        offlinePool.length > 0 ? (
          renderCardShelf('Available Offline', offlinePool, 'Available Offline')
        ) : effectiveFilter === 'offline' ? (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Available Offline</Text>
            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
              No downloaded or local device tracks yet. Download Creative Commons tracks or import local audio files in Your Library.
            </Text>
          </View>
        ) : null
      )}

      {/* Circular Artists Shelf */}
      {!offlineOnly && showMusic && featuredArtists.length > 0 && (
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Artists for you</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {featuredArtists.map((artist) => (
              <PlaylistCard
                key={artist.id}
                title={artist.name}
                artworkUrl={artist.artworkUrl}
                dominantColor={artist.color}
                size={118}
                circular
                onPress={() =>
                  router.push({
                    pathname: '/artist/[id]',
                    params: { id: artist.id, name: artist.name },
                  })
                }
              />
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: 10,
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: Radii.pill,
  },
  filterPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  quickTile: {
    width: '48.8%',
    height: 54,
    borderRadius: Radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  quickThumb: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitleWrap: {
    flex: 1,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  quickTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    lineHeight: 16,
  },
  sectionBlock: {
    marginTop: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 21,
    letterSpacing: -0.4,
    paddingHorizontal: Spacing.lg,
  },
  horizontalList: {
    paddingHorizontal: Spacing.lg,
  },
  emptyHint: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
});
