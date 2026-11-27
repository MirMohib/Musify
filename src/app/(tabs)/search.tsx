import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileAvatar } from '@/components/ProfileAvatar';
import { SongListSkeleton } from '@/components/SkeletonLoader';
import { SongTile } from '@/components/SongTile';
import { TrackArtwork } from '@/components/TrackArtwork';
import { BROWSE_GENRES, type BrowseGenre } from '@/data/seedCatalog';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { customApiSourceProvider } from '@/services/sources/customApiSource';
import { jamendoSourceProvider } from '@/services/sources/jamendoSource';
import { searchAllSources } from '@/services/sources/sourceRegistry';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';
import type { MusicSourceId, Track } from '@/types/music';

const SOURCE_FILTERS: { id: MusicSourceId | 'all'; label: string }[] = [
  { id: 'all', label: 'All Sources' },
  { id: 'audius', label: 'Audius' },
  { id: 'hearthis', label: 'HearThis' },
  { id: 'radio', label: 'Radio' },
  { id: 'archive', label: 'Archive' },
  { id: 'jamendo', label: 'Jamendo' },
  { id: 'custom', label: 'Custom' },
  { id: 'local', label: 'Device' },
];

const DISCOVER_TAGS = [
  { id: 'tag-electronic', tag: '#electronic', query: 'electronic', color: Palette.genrePop },
  { id: 'tag-ambient', tag: '#ambient', query: 'ambient', color: Palette.genreNews },
  { id: 'tag-lofi', tag: '#lofi', query: 'lofi', color: Palette.genrePodcasts },
  { id: 'tag-jazz', tag: '#jazz', query: 'jazz', color: Palette.genreComedy },
  { id: 'tag-indie', tag: '#indie', query: 'indie', color: Palette.genreIndie },
];

function GenreCard({
  genre,
  artworkUrl,
  onPress,
}: {
  genre: BrowseGenre;
  artworkUrl?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.genreCard,
        { backgroundColor: genre.color },
        pressed && { opacity: 0.82 },
      ]}
    >
      <Text style={styles.genreTitle} numberOfLines={2}>
        {genre.title}
      </Text>

      <View style={styles.genreTiltedBox}>
        {artworkUrl ? (
          <Image
            source={{ uri: artworkUrl }}
            style={styles.genreTiltedImg}
            contentFit="cover"
          />
        ) : genre.artworkAsset ? (
          <Image
            source={genre.artworkAsset}
            style={styles.genreTiltedImg}
            contentFit="cover"
          />
        ) : (
          <View style={styles.genreTiltedPlaceholder}>
            <Ionicons name="musical-notes" size={24} color="rgba(255,255,255,0.85)" />
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const offlineOnly = useSettingsStore((s) => s.settings.offlineOnly);
  const openProfileDrawer = useSettingsStore((s) => s.openProfileDrawer);

  const discoveryFeed = useLibraryStore((s) => s.discoveryFeed);
  const tracksById = useLibraryStore((s) => s.tracksById);
  const recentSearches = useLibraryStore((s) => s.recentSearches);
  const addRecentSearch = useLibraryStore((s) => s.addRecentSearch);
  const clearRecentSearches = useLibraryStore((s) => s.clearRecentSearches);
  const registerTracks = useLibraryStore((s) => s.registerTracks);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const downloads = useDownloadStore((s) => s.downloads);
  const downloadTrack = useDownloadStore((s) => s.downloadTrack);

  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<MusicSourceId | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Track[]>([]);
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);

  const artworkPool = useMemo(() => {
    const combined = [...discoveryFeed.allTracks, ...Object.values(tracksById)];
    return combined.filter((t) => Boolean(t.localArtworkUri || t.artworkUrl));
  }, [discoveryFeed.allTracks, tracksById]);

  useEffect(() => {
    if (!isSearching) return;
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const out = await searchAllSources(trimmed, offlineOnly, sourceFilter);
        if (!cancelled) {
          registerTracks(out.tracks);
          setResults(out.tracks);
          setSourceErrors(out.errors.map((e) => `${e.sourceId}: ${e.message}`));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 380);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, sourceFilter, isSearching, offlineOnly, registerTracks]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      setSourceErrors([]);
    }
  };

  const handleOpenQuery = (q: string, filter: MusicSourceId | 'all' = 'all') => {
    setSourceFilter(filter);
    setIsSearching(true);
    setQuery(q);
  };

  const handleTrackPress = useCallback(
    async (track: Track) => {
      await addRecentSearch({
        id: `track:${track.id}`,
        query: query.trim() || track.title,
        kind: 'track',
        title: track.title,
        subtitle: `Song · ${track.artist}`,
        artworkUrl: track.artworkUrl,
      });
      await playTrack(track, results.length > 0 ? results : [track], query.trim() || 'Search');
    },
    [addRecentSearch, playTrack, query, results]
  );

  const handleDownload = useCallback(
    async (track: Track) => {
      try {
        await downloadTrack(track);
      } catch (err) {
        Alert.alert('Download Unavailable', err instanceof Error ? err.message : 'Unable to download.');
      }
    },
    [downloadTrack]
  );

  const renderSearchItem = useCallback(
    ({ item }: { item: Track }) => (
      <SongTile
        track={item}
        isActive={currentTrack?.id === item.id}
        showSourceBadge
        showDownloadAction
        downloadRecord={downloads[item.id]}
        onPress={() => handleTrackPress(item)}
        onDownloadPress={() => handleDownload(item)}
        onMorePress={() =>
          router.push({ pathname: '/track-options', params: { trackId: item.id } })
        }
      />
    ),
    [currentTrack?.id, downloads, handleDownload, handleTrackPress, router]
  );

  const keyExtractor = useCallback((item: Track) => item.id, []);

  if (isSearching) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.activeHeader}>
          <View style={[styles.activeInputWrap, { backgroundColor: theme.surfaceElevated }]}>
            <Ionicons name="search" size={16} color={theme.textSecondary} />
            <TextInput
              value={query}
              onChangeText={handleQueryChange}
              placeholder="What do you want to listen to?"
              placeholderTextColor={theme.textSecondary}
              autoFocus
              returnKeyType="search"
              style={[styles.activeInput, { color: theme.text }]}
            />
            {query.length > 0 && (
              <Pressable onPress={() => handleQueryChange('')} hitSlop={8}>
                <Ionicons name="close-circle" size={17} color={theme.textSecondary} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => {
              setQuery('');
              setResults([]);
              setIsSearching(false);
            }}
            hitSlop={8}
          >
            <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {SOURCE_FILTERS.map((f) => {
            const active = sourceFilter === f.id;
            const unconfigured =
              (f.id === 'jamendo' && !jamendoSourceProvider.isConfigured()) ||
              (f.id === 'custom' && !customApiSourceProvider.isConfigured());
            return (
              <Pressable
                key={f.id}
                onPress={() => setSourceFilter(f.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? Palette.brandGreen : theme.surfaceElevated,
                    borderColor: active ? Palette.brandGreen : theme.border,
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
                  {unconfigured ? ' (Setup)' : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {sourceFilter === 'jamendo' && !jamendoSourceProvider.isConfigured() && (
          <View style={[styles.infoBanner, { backgroundColor: theme.surfaceElevated }]}>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Set <Text style={{ color: theme.text }}>EXPO_PUBLIC_JAMENDO_CLIENT_ID</Text> in{' '}
              <Text style={{ color: theme.text }}>.env</Text> to search Jamendo. Audius, HearThis,
              Radio, Internet Archive &amp; Device Music work immediately.
            </Text>
          </View>
        )}

        {sourceFilter === 'custom' && !customApiSourceProvider.isConfigured() && (
          <Pressable
            onPress={() => router.push('/settings')}
            style={[styles.infoBanner, { backgroundColor: theme.surfaceElevated }]}
          >
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              No custom audio server URL set. Tap here to configure your{' '}
              <Text style={{ color: Palette.brandGreen }}>Custom Audio Server</Text> in Settings.
            </Text>
          </Pressable>
        )}

        {query.trim().length === 0 ? (
          <ScrollView contentContainerStyle={styles.recentContainer}>
            <View style={styles.recentHeaderRow}>
              <Text style={[styles.recentHeading, { color: theme.text }]}>Recent searches</Text>
              {recentSearches.length > 0 && (
                <Pressable onPress={clearRecentSearches}>
                  <Text style={[styles.clearText, { color: theme.textSecondary }]}>Clear</Text>
                </Pressable>
              )}
            </View>
            {recentSearches.length === 0 ? (
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Search free tracks, mixes, and live stations across Audius, HearThis.at, Radio
                Browser, Internet Archive, Jamendo, your custom server, and this device.
              </Text>
            ) : (
              recentSearches.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setQuery(item.query)}
                  style={styles.recentRow}
                >
                  <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recentTitle, { color: theme.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.subtitle && (
                      <Text
                        style={[styles.recentSub, { color: theme.textSecondary }]}
                        numberOfLines={1}
                      >
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        ) : loading ? (
          <View style={{ paddingTop: Spacing.md }}>
            <SongListSkeleton count={7} />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={keyExtractor}
            windowSize={7}
            maxToRenderPerBatch={8}
            initialNumToRender={10}
            removeClippedSubviews={Platform.OS !== 'web'}
            ListHeaderComponent={
              sourceErrors.length > 0 ? (
                <Text style={styles.warningText}>{sourceErrors.join(' · ')}</Text>
              ) : undefined
            }
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                  No tracks found for “{query}”. Try another keyword or source filter.
                </Text>
              </View>
            }
            renderItem={renderSearchItem}
          />
        )}
      </View>
    );
  }

  const topFour = BROWSE_GENRES.slice(0, 4);
  const restGenres = BROWSE_GENRES.slice(4);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + 10,
        paddingBottom: 28,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header: Profile Avatar + Search + Camera */}
      <View style={styles.browseHeader}>
        <View style={styles.browseTitleGroup}>
          <ProfileAvatar size={34} onPress={openProfileDrawer} />
          <Text style={[styles.screenTitle, { color: theme.text }]}>Search</Text>
        </View>
        <Pressable
          onPress={() => router.push('/scanner')}
          hitSlop={10}
          accessibilityLabel="Open scanner"
        >
          <Ionicons name="camera-outline" size={25} color={theme.text} />
        </Pressable>
      </View>

      {/* White Search Bar */}
      <Pressable
        onPress={() => setIsSearching(true)}
        style={styles.whiteSearchBar}
        accessibilityRole="search"
      >
        <Ionicons name="search" size={20} color="#131313" />
        <Text style={styles.whiteSearchPlaceholder}>What do you want to listen to?</Text>
      </Pressable>

      {/* Top 2x2 Category Cards */}
      <View style={styles.gridWrap}>
        {topFour.map((g, idx) => {
          const sample = artworkPool[idx];
          return (
            <GenreCard
              key={g.id}
              genre={g}
              artworkUrl={sample?.localArtworkUri || sample?.artworkUrl}
              onPress={() => handleOpenQuery(g.query)}
            />
          );
        })}
      </View>

      {/* Discover Something New - Tall Portrait Cards */}
      <Text style={[styles.sectionHeading, { color: theme.text, marginTop: Spacing.xl }]}>
        Discover something new
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.discoverRow}
        style={styles.discoverScroll}
      >
        {DISCOVER_TAGS.map((item, idx) => {
          const sample = artworkPool[(idx + 4) % Math.max(1, artworkPool.length)];
          return (
            <Pressable
              key={item.id}
              onPress={() => handleOpenQuery(item.query)}
              style={({ pressed }) => [
                styles.discoverCard,
                { backgroundColor: item.color },
                pressed && { opacity: 0.85 },
              ]}
            >
              {sample && (
                <TrackArtwork
                  artworkUrl={sample.artworkUrl}
                  localArtworkUri={sample.localArtworkUri}
                  dominantColor={item.color}
                  size={200}
                  borderRadius={0}
                  style={styles.discoverBgImg}
                />
              )}
              <LinearGradient
                colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.78)']}
                style={styles.discoverOverlay}
              >
                <Text style={styles.discoverTag}>{item.tag}</Text>
              </LinearGradient>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Browse All Grid */}
      <Text style={[styles.sectionHeading, { color: theme.text, marginTop: Spacing.lg }]}>
        Browse all
      </Text>
      <View style={styles.gridWrap}>
        {restGenres.map((g, idx) => {
          const sample = artworkPool[idx + 2];
          return (
            <GenreCard
              key={g.id}
              genre={g}
              artworkUrl={sample?.localArtworkUri || sample?.artworkUrl}
              onPress={() => handleOpenQuery(g.query)}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  browseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  browseTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  screenTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
  },
  whiteSearchBar: {
    height: 46,
    borderRadius: Radii.md,
    backgroundColor: Palette.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: 10,
    marginBottom: Spacing.lg,
  },
  whiteSearchPlaceholder: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: '#131313',
  },
  sectionHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    marginBottom: Spacing.md,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  genreCard: {
    width: '48%',
    height: 92,
    borderRadius: Radii.md,
    padding: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  genreTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15.5,
    color: Palette.white,
    maxWidth: '68%',
  },
  genreTiltedBox: {
    position: 'absolute',
    right: -12,
    bottom: -6,
    width: 64,
    height: 64,
    transform: [{ rotate: '22deg' }],
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  genreTiltedImg: {
    width: '100%',
    height: '100%',
  },
  genreTiltedPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverScroll: {
    marginHorizontal: -Spacing.lg,
  },
  discoverRow: {
    paddingHorizontal: Spacing.lg,
    gap: 12,
  },
  discoverCard: {
    width: 128,
    height: 200,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  discoverBgImg: {
    width: '100%',
    height: '100%',
  },
  discoverOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  discoverTag: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Palette.white,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: 12,
  },
  activeInputWrap: {
    flex: 1,
    height: 38,
    borderRadius: Radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  activeInput: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 14,
    paddingVertical: 0,
  },
  cancelText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
  },
  filterScroll: {
    maxHeight: 44,
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterPillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
  },
  infoBanner: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  infoText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  recentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  recentHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  clearText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  recentTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14.5,
  },
  recentSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyHint: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  warningText: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Palette.warning,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
  },
});
