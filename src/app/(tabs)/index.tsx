import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
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
import { HomeFeedSkeleton } from '@/components/SkeletonLoader';
import { SongTile } from '@/components/SongTile';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';
import type { Track } from '@/types/music';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const offlineOnly = useSettingsStore((s) => s.settings.offlineOnly);

  const tracksById = useLibraryStore((s) => s.tracksById);
  const playlists = useLibraryStore((s) => s.playlists);
  const likedTrackIds = useLibraryStore((s) => s.likedTrackIds);
  const recentlyPlayedIds = useLibraryStore((s) => s.recentlyPlayedIds);
  const discoveryFeed = useLibraryStore((s) => s.discoveryFeed);
  const isLoadingFeed = useLibraryStore((s) => s.isLoadingFeed);
  const isScanningDevice = useLibraryStore((s) => s.isScanningDevice);
  const refreshDiscovery = useLibraryStore((s) => s.refreshDiscovery);
  const rescanDeviceMusic = useLibraryStore((s) => s.rescanDeviceMusic);

  const downloads = useDownloadStore((s) => s.downloads);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playTrack = usePlayerStore((s) => s.playTrack);

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

  // Extract unique artists and albums dynamically from live provider + device tracks
  const featuredArtists = useMemo(() => {
    const map = new Map<string, { id: string; name: string; artworkUrl?: string; color?: string }>();
    const pool = [...recentTracks, ...discoveryFeed.allTracks, ...localTracks];
    for (const t of pool) {
      if (!t.artist || map.has(t.artist.toLowerCase())) continue;
      map.set(t.artist.toLowerCase(), {
        id: t.artistId || t.artist,
        name: t.artist,
        artworkUrl: t.artworkUrl,
        color: t.dominantColor,
      });
      if (map.size >= 10) break;
    }
    return Array.from(map.values());
  }, [recentTracks, discoveryFeed.allTracks, localTracks]);

  const featuredAlbums = useMemo(() => {
    const map = new Map<string, { id: string; title: string; artist: string; artworkUrl?: string; color?: string }>();
    const pool = [...discoveryFeed.allTracks, ...localTracks];
    for (const t of pool) {
      if (!t.album) continue;
      const key = t.albumId || t.album;
      if (map.has(key)) continue;
      map.set(key, {
        id: key,
        title: t.album,
        artist: t.artist,
        artworkUrl: t.artworkUrl,
        color: t.dominantColor,
      });
      if (map.size >= 10) break;
    }
    return Array.from(map.values());
  }, [discoveryFeed.allTracks, localTracks]);

  const handleRefresh = async () => {
    await Promise.all([
      rescanDeviceMusic(false),
      offlineOnly ? Promise.resolve() : refreshDiscovery(),
    ]);
  };

  const renderTrackRow = (track: Track, list: Track[], contextTitle: string) => (
    <SongTile
      key={track.id}
      track={track}
      isActive={currentTrack?.id === track.id}
      showSourceBadge
      showDownloadAction
      onPress={() => playTrack(track, list, contextTitle)}
      onMorePress={() =>
        router.push({ pathname: '/track-options', params: { trackId: track.id } })
      }
    />
  );

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.backgroundHome }]}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: 32,
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
      {/* Top Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {recentTracks.length > 0 ? 'Recently played' : 'Discover on Musify'}
        </Text>
        <View style={styles.headerIcons}>
          <Pressable
            onPress={() => router.push('/downloads')}
            hitSlop={10}
            accessibilityLabel="Downloads and Offline"
          >
            <Ionicons name="arrow-down-circle-outline" size={24} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/queue')}
            hitSlop={10}
            accessibilityLabel="Playback Queue"
          >
            <Ionicons name="time-outline" size={23} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={10}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={23} color={theme.text} />
          </Pressable>
        </View>
      </View>

      {/* Recently Played Shelf from SQLite */}
      {recentTracks.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {recentTracks.slice(0, 12).map((track) => (
            <PlaylistCard
              key={`recent-${track.id}`}
              title={track.title}
              subtitle={track.artist}
              artworkUrl={track.artworkUrl}
              localArtworkUri={track.localArtworkUri}
              dominantColor={track.dominantColor}
              size={112}
              onPress={() => playTrack(track, recentTracks, 'Recently played')}
            />
          ))}
        </ScrollView>
      )}

      {/* Quick Access Library Shortcuts (Real SQLite counts) */}
      <View style={styles.quickGrid}>
        <Pressable
          onPress={() => router.push('/playlist/liked')}
          style={[styles.quickTile, { backgroundColor: theme.surfaceElevated }]}
        >
          <View style={[styles.quickIcon, { backgroundColor: Palette.likedGradientStart }]}>
            <Ionicons name="heart" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.quickTitle, { color: theme.text }]} numberOfLines={1}>
              Liked Songs
            </Text>
            <Text style={[styles.quickSub, { color: theme.textSecondary }]}>
              {likedTrackIds.length} songs
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push('/downloads')}
          style={[styles.quickTile, { backgroundColor: theme.surfaceElevated }]}
        >
          <View style={[styles.quickIcon, { backgroundColor: Palette.episodesBg }]}>
            <Ionicons name="cloud-done" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.quickTitle, { color: theme.text }]} numberOfLines={1}>
              Downloads
            </Text>
            <Text style={[styles.quickSub, { color: theme.textSecondary }]}>
              {downloadedTracks.length} offline
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push({ pathname: '/(tabs)/library', params: { filter: 'device' } })}
          style={[styles.quickTile, { backgroundColor: theme.surfaceElevated }]}
        >
          <View style={[styles.quickIcon, { backgroundColor: '#2A4D3E' }]}>
            <Ionicons name="phone-portrait" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.quickTitle, { color: theme.text }]} numberOfLines={1}>
              Device Music
            </Text>
            <Text style={[styles.quickSub, { color: theme.textSecondary }]}>
              {localTracks.length} local
            </Text>
          </View>
        </Pressable>

        {playlists[0] ? (
          <Pressable
            onPress={() => router.push(`/playlist/${encodeURIComponent(playlists[0].id)}`)}
            style={[styles.quickTile, { backgroundColor: theme.surfaceElevated }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#3B2667' }]}>
              <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quickTitle, { color: theme.text }]} numberOfLines={1}>
                {playlists[0].name}
              </Text>
              <Text style={[styles.quickSub, { color: theme.textSecondary }]}>
                {playlists[0].trackIds.length} songs
              </Text>
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push('/(tabs)/library')}
            style={[styles.quickTile, { backgroundColor: theme.surfaceElevated }]}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#333333' }]}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quickTitle, { color: theme.text }]} numberOfLines={1}>
                Playlists
              </Text>
              <Text style={[styles.quickSub, { color: theme.textSecondary }]}>
                Create or browse
              </Text>
            </View>
          </Pressable>
        )}
      </View>

      {/* Offline Only View */}
      {offlineOnly && (
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Available Offline
          </Text>
          {[...downloadedTracks, ...localTracks].length === 0 ? (
            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
              No downloaded or local device tracks yet. Disable Offline Only in Downloads/Settings
              or import local audio files in Your Library.
            </Text>
          ) : (
            [...downloadedTracks, ...localTracks].map((t) =>
              renderTrackRow(t, [...downloadedTracks, ...localTracks], 'Available Offline')
            )
          )}
        </View>
      )}

      {/* Skeleton placeholder while initial live feed loads */}
      {!offlineOnly && isLoadingFeed && discoveryFeed.allTracks.length === 0 && (
        <HomeFeedSkeleton />
      )}

      {/* Live Featured Artists */}
      {!offlineOnly && featuredArtists.length > 0 && (
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
                size={112}
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

      {/* Live Collections / Albums */}
      {!offlineOnly && featuredAlbums.length > 0 && (
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Popular collections</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {featuredAlbums.map((alb) => (
              <PlaylistCard
                key={alb.id}
                title={alb.title}
                subtitle={alb.artist}
                artworkUrl={alb.artworkUrl}
                dominantColor={alb.color}
                size={146}
                onPress={() =>
                  router.push({
                    pathname: '/album/[id]',
                    params: { id: alb.id, title: alb.title, artist: alb.artist },
                  })
                }
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Live Audius Trending */}
      {!offlineOnly && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
              Trending on Audius
            </Text>
            {isLoadingFeed ? (
              <ActivityIndicator size="small" color={Palette.brandGreen} />
            ) : (
              <Text style={styles.liveTag}>LIVE</Text>
            )}
          </View>

          {discoveryFeed.audiusTracks.length === 0 && !isLoadingFeed ? (
            <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
              Pull down to load trending Audius releases.
            </Text>
          ) : (
            discoveryFeed.audiusTracks
              .slice(0, 6)
              .map((t) => renderTrackRow(t, discoveryFeed.audiusTracks, 'Trending on Audius'))
          )}
        </View>
      )}

      {/* Live Internet Archive & Jamendo Free Downloadable Tracks */}
      {!offlineOnly &&
        (discoveryFeed.archiveTracks.length > 0 || discoveryFeed.jamendoTracks.length > 0) && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
                Free &amp; Downloadable (CC)
              </Text>
              <Text style={[styles.liveTag, { backgroundColor: '#27856B', color: '#FFFFFF' }]}>
                OFFLINE READY
              </Text>
            </View>
            {[...discoveryFeed.jamendoTracks, ...discoveryFeed.archiveTracks]
              .slice(0, 8)
              .map((t) =>
                renderTrackRow(
                  t,
                  [...discoveryFeed.jamendoTracks, ...discoveryFeed.archiveTracks],
                  'Free Creative Commons'
                )
              )}
          </View>
        )}

      {/* HearThis.at Indie Mixes & Tracks */}
      {!offlineOnly && discoveryFeed.hearthisTracks.length > 0 && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
              HearThis.at Mixes &amp; Sets
            </Text>
            <Text style={[styles.liveTag, { backgroundColor: '#1E3264', color: '#FFFFFF' }]}>
              HEARTHIS
            </Text>
          </View>
          {discoveryFeed.hearthisTracks
            .slice(0, 5)
            .map((t) => renderTrackRow(t, discoveryFeed.hearthisTracks, 'HearThis.at Popular'))}
        </View>
      )}

      {/* Live Global Radio Stations */}
      {!offlineOnly && discoveryFeed.radioTracks.length > 0 && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
              Live Global Radio
            </Text>
            <Text style={[styles.liveTag, { backgroundColor: '#B49BC8', color: '#121212' }]}>
              ON AIR
            </Text>
          </View>
          {discoveryFeed.radioTracks
            .slice(0, 5)
            .map((t) => renderTrackRow(t, discoveryFeed.radioTracks, 'Live Radio'))}
        </View>
      )}

      {/* Device Music Preview */}
      {localTracks.length > 0 && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>
              On This Device
            </Text>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/(tabs)/library', params: { filter: 'device' } })
              }
            >
              <Text style={[styles.seeAll, { color: Palette.brandGreen }]}>See all</Text>
            </Pressable>
          </View>
          {localTracks.slice(0, 4).map((t) => renderTrackRow(t, localTracks, 'Device Music'))}
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
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 21,
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
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    gap: 10,
    marginTop: Spacing.sm,
  },
  quickTile: {
    width: '48.5%',
    height: 56,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    paddingRight: 10,
    gap: 10,
  },
  quickIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  quickSub: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
  },
  sectionBlock: {
    marginTop: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    letterSpacing: -0.4,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
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
  seeAll: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  emptyHint: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    paddingHorizontal: Spacing.lg,
    lineHeight: 20,
  },
});
