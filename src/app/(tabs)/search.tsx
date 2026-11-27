import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SongTile } from '@/components/SongTile';
import { BROWSE_GENRES, type BrowseGenre } from '@/data/seedCatalog';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
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
  { id: 'archive', label: 'Archive' },
  { id: 'jamendo', label: 'Jamendo' },
  { id: 'local', label: 'Device' },
];

function GenreCard({
  genre,
  onPress,
}: {
  genre: BrowseGenre;
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
        {genre.artworkAsset ? (
          <Image
            source={genre.artworkAsset}
            style={styles.genreTiltedImg}
            contentFit="cover"
          />
        ) : (
          <View style={styles.genreTiltedPlaceholder}>
            <Text style={styles.genreTiltedText}>Album</Text>
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

  const handleOpenGenre = (genre: BrowseGenre) => {
    setIsSearching(true);
    setQuery(genre.query);
  };

  const handleTrackPress = async (track: Track) => {
    await addRecentSearch({
      id: `track:${track.id}`,
      query: query.trim() || track.title,
      kind: 'track',
      title: track.title,
      subtitle: `Song · ${track.artist}`,
      artworkUrl: track.artworkUrl,
    });
    await playTrack(track, results.length > 0 ? results : [track], query.trim() || 'Search');
  };

  const handleDownload = async (track: Track) => {
    try {
      await downloadTrack(track);
    } catch (err) {
      Alert.alert('Download Unavailable', err instanceof Error ? err.message : 'Unable to download.');
    }
  };

  if (isSearching) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        {/* Active Search Header matching Figma 1:223 */}
        <View style={styles.activeHeader}>
          <View style={[styles.activeInputWrap, { backgroundColor: theme.surfaceElevated }]}>
            <Ionicons name="search" size={16} color={theme.textSecondary} />
            <TextInput
              value={query}
              onChangeText={handleQueryChange}
              placeholder="Search artists, songs, or sources"
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

        {/* Source filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {SOURCE_FILTERS.map((f) => {
            const active = sourceFilter === f.id;
            const unconfigured = f.id === 'jamendo' && !jamendoSourceProvider.isConfigured();
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
              <Text style={{ color: theme.text }}>.env</Text> to search Jamendo. Audius, Internet
              Archive &amp; Device Music work immediately.
            </Text>
          </View>
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
                Search millions of free Creative Commons tracks across Audius, Internet Archive,
                Jamendo, and your device.
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
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Palette.brandGreen} />
            <Text style={[styles.emptyHint, { color: theme.textSecondary, marginTop: 12 }]}>
              Searching across music sources...
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
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
            renderItem={({ item }) => (
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
            )}
          />
        )}
      </View>
    );
  }

  const topGenres = BROWSE_GENRES.filter((g) => g.section === 'top');
  const podcastGenres = BROWSE_GENRES.filter((g) => g.section === 'podcast');
  const browseAllGenres = BROWSE_GENRES.filter((g) => g.section === 'all');

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + 14,
        paddingBottom: 28,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Search Browse Header matching Figma 42:1795 */}
      <View style={styles.browseHeader}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>Search</Text>
        <Pressable onPress={() => router.push('/scanner')} hitSlop={10}>
          <Ionicons name="camera-outline" size={25} color={theme.text} />
        </Pressable>
      </View>

      {/* White Search Bar matching Figma 42:1907 */}
      <Pressable
        onPress={() => setIsSearching(true)}
        style={styles.whiteSearchBar}
        accessibilityRole="search"
      >
        <Ionicons name="search" size={20} color="#131313" />
        <Text style={styles.whiteSearchPlaceholder}>Artists, songs, or podcasts</Text>
      </Pressable>

      <Text style={[styles.sectionHeading, { color: theme.text }]}>Your top genres</Text>
      <View style={styles.gridRow}>
        {topGenres.map((g) => (
          <GenreCard key={g.id} genre={g} onPress={() => handleOpenGenre(g)} />
        ))}
      </View>

      <Text style={[styles.sectionHeading, { color: theme.text }]}>
        Popular podcast categories
      </Text>
      <View style={styles.gridRow}>
        {podcastGenres.map((g) => (
          <GenreCard key={g.id} genre={g} onPress={() => handleOpenGenre(g)} />
        ))}
      </View>

      <Text style={[styles.sectionHeading, { color: theme.text }]}>Browse all</Text>
      <View style={styles.gridWrap}>
        {browseAllGenres.map((g) => (
          <GenreCard key={g.id} genre={g} onPress={() => handleOpenGenre(g)} />
        ))}
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
    marginBottom: Spacing.lg,
  },
  screenTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 25,
  },
  whiteSearchBar: {
    height: 46,
    borderRadius: Radii.md,
    backgroundColor: Palette.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: 10,
    marginBottom: Spacing.xl,
  },
  whiteSearchPlaceholder: {
    fontFamily: FontFamily.medium,
    fontSize: 15.5,
    color: '#131313',
  },
  sectionHeading: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  genreCard: {
    width: '48%',
    height: 106,
    borderRadius: Radii.sm,
    padding: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  genreTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Palette.white,
    maxWidth: '72%',
  },
  genreTiltedBox: {
    position: 'absolute',
    right: -14,
    bottom: -6,
    width: 67,
    height: 67,
    transform: [{ rotate: '20deg' }],
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: Palette.surfaceCard,
  },
  genreTiltedImg: {
    width: '100%',
    height: '100%',
  },
  genreTiltedPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceCard,
  },
  genreTiltedText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
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
