import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaylistFormModal } from '@/components/PlaylistModal';
import { SongTile } from '@/components/SongTile';
import { TrackArtwork } from '@/components/TrackArtwork';
import { FigmaAssets } from '@/constants/figmaAssets';
import { SEEDED_ALBUMS, SEEDED_ARTISTS } from '@/data/seedCatalog';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';
import type { Playlist } from '@/types/music';

type FilterChip = 'all' | 'playlists' | 'artists' | 'albums' | 'device';

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const profile = useSettingsStore((s) => s.profile);

  const tracksById = useLibraryStore((s) => s.tracksById);
  const playlists = useLibraryStore((s) => s.playlists);
  const likedTrackIds = useLibraryStore((s) => s.likedTrackIds);
  const importLocalMusic = useLibraryStore((s) => s.importLocalMusic);
  const scanLocalMusic = useLibraryStore((s) => s.scanLocalMusic);

  const downloads = useDownloadStore((s) => s.downloads);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [sortMode, setSortMode] = useState<'recent' | 'alpha'>('recent');
  const [showSearch, setShowSearch] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const localTracks = useMemo(
    () => Object.values(tracksById).filter((t) => t.sourceId === 'local'),
    [tracksById]
  );

  const completedDownloadsCount = useMemo(
    () => Object.values(downloads).filter((d) => d.status === 'completed').length,
    [downloads]
  );

  const filteredPlaylists = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const list = playlists.filter((p) => !q || p.name.toLowerCase().includes(q));
    if (sortMode === 'alpha') {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [playlists, filterText, sortMode]);

  const handleImportFiles = async () => {
    const res = await importLocalMusic();
    if (!res.canceled && res.imported.length > 0) {
      Alert.alert('Imported Audio', `Added ${res.imported.length} track(s) to Device Music.`);
    }
  };

  const handleScanAndroid = async () => {
    const res = await scanLocalMusic();
    if (res.message) {
      Alert.alert('Device Scan', res.message);
    } else {
      Alert.alert('Device Scan Complete', `Found ${res.count} audio file(s) on your device.`);
    }
  };

  const renderPlaylistRow = (pl: Playlist) => {
    const firstTrack = pl.trackIds[0] ? tracksById[pl.trackIds[0]] : undefined;
    return (
      <Pressable
        key={pl.id}
        onPress={() => router.push(`/playlist/${encodeURIComponent(pl.id)}`)}
        style={styles.libraryRow}
      >
        <TrackArtwork
          artworkUrl={pl.artworkUrl ?? firstTrack?.artworkUrl}
          artworkAsset={pl.artworkAsset ?? firstTrack?.artworkAsset}
          dominantColor={firstTrack?.dominantColor}
          size={64}
          borderRadius={2}
        />
        <View style={styles.rowMeta}>
          <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
            {pl.name}
          </Text>
          <Text style={[styles.rowSub, { color: theme.textSecondary }]} numberOfLines={1}>
            Playlist · {pl.owner} · {pl.trackIds.length} songs
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      {/* Header matching Figma Library 107:3506 */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          style={styles.headerLeft}
        >
          <TrackArtwork
            artworkAsset={FigmaAssets.editors1}
            size={34}
            circular
          />
          <Text style={[styles.headerTitle, { color: theme.text }]}>Your Library</Text>
        </Pressable>

        <View style={styles.headerRight}>
          <Pressable onPress={() => setShowSearch((v) => !v)} hitSlop={10}>
            <Ionicons name="search" size={23} color={theme.text} />
          </Pressable>
          <Pressable onPress={() => setShowCreateModal(true)} hitSlop={10}>
            <Ionicons name="add" size={28} color={theme.text} />
          </Pressable>
        </View>
      </View>

      {showSearch && (
        <View style={[styles.inlineSearch, { backgroundColor: theme.surfaceElevated }]}>
          <Ionicons name="search" size={16} color={theme.textSecondary} />
          <TextInput
            value={filterText}
            onChangeText={setFilterText}
            placeholder="Filter your library"
            placeholderTextColor={theme.textSecondary}
            style={[styles.inlineInput, { color: theme.text }]}
          />
        </View>
      )}

      {/* Filter pills matching Figma Frame 328 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        {activeFilter !== 'all' && (
          <Pressable
            onPress={() => setActiveFilter('all')}
            style={[styles.clearChip, { borderColor: theme.border }]}
          >
            <Ionicons name="close" size={16} color={theme.text} />
          </Pressable>
        )}
        {(
          [
            { id: 'playlists', label: 'Playlists' },
            { id: 'artists', label: 'Artists' },
            { id: 'albums', label: 'Albums' },
            { id: 'device', label: 'Device Music' },
          ] as const
        ).map((chip) => {
          const active = activeFilter === chip.id;
          return (
            <Pressable
              key={chip.id}
              onPress={() => setActiveFilter(active ? 'all' : chip.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? Palette.brandGreen : 'transparent',
                  borderColor: active ? Palette.brandGreen : theme.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? '#121212' : theme.text }]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => router.push('/(tabs)/downloads')}
          style={[styles.chip, { borderColor: theme.border }]}
        >
          <Text style={[styles.chipText, { color: theme.text }]}>
            Downloads ({completedDownloadsCount})
          </Text>
        </Pressable>
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {/* Sort bar matching Figma 107:3580..3582 */}
        <View style={styles.sortRow}>
          <Pressable
            onPress={() => setSortMode((m) => (m === 'recent' ? 'alpha' : 'recent'))}
            style={styles.sortBtn}
          >
            <Ionicons name="swap-vertical" size={14} color={theme.text} />
            <Text style={[styles.sortText, { color: theme.text }]}>
              {sortMode === 'recent' ? 'Recently played' : 'Alphabetical'}
            </Text>
          </Pressable>
          <Text style={[styles.profileTag, { color: theme.textSecondary }]}>
            {profile.name}
          </Text>
        </View>

        {/* Pinned: Liked Songs (Figma Frame 285) */}
        {(activeFilter === 'all' || activeFilter === 'playlists') && (
          <Pressable
            onPress={() => router.push('/playlist/liked')}
            style={styles.libraryRow}
          >
            <LinearGradient
              colors={[Palette.likedGradientStart, Palette.likedGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.specialSquare}
            >
              <Ionicons name="heart" size={26} color={Palette.white} />
            </LinearGradient>
            <View style={styles.rowMeta}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Liked Songs</Text>
              <View style={styles.subWithPin}>
                <Ionicons name="pin" size={12} color={Palette.brandGreen} />
                <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                  Playlist · {likedTrackIds.length} songs
                </Text>
              </View>
            </View>
          </Pressable>
        )}

        {/* Pinned: Downloads shortcut (matching Figma Frame 286 slot) */}
        {activeFilter === 'all' && (
          <Pressable
            onPress={() => router.push('/(tabs)/downloads')}
            style={styles.libraryRow}
          >
            <View style={[styles.specialSquare, { backgroundColor: Palette.episodesBg }]}>
              <Ionicons name="arrow-down-circle" size={28} color={Palette.brandGreen} />
            </View>
            <View style={styles.rowMeta}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Downloads &amp; Offline</Text>
              <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                Offline ready · {completedDownloadsCount} tracks
              </Text>
            </View>
          </Pressable>
        )}

        {/* Device Music Section / Actions */}
        {(activeFilter === 'all' || activeFilter === 'device') && (
          <View style={[styles.deviceCard, { backgroundColor: theme.surfaceElevated }]}>
            <View style={styles.deviceHeader}>
              <View style={styles.deviceTitleRow}>
                <Ionicons name="phone-portrait-outline" size={20} color={Palette.brandGreen} />
                <Text style={[styles.deviceTitle, { color: theme.text }]}>
                  Device Music ({localTracks.length})
                </Text>
              </View>
              <View style={styles.deviceBtns}>
                <Pressable onPress={handleImportFiles} style={styles.deviceActionPill}>
                  <Text style={styles.deviceActionText}>Import Files</Text>
                </Pressable>
                {Platform.OS === 'android' && (
                  <Pressable
                    onPress={handleScanAndroid}
                    style={[styles.deviceActionPill, { backgroundColor: '#3A3A3C' }]}
                  >
                    <Text style={[styles.deviceActionText, { color: Palette.white }]}>Scan</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {activeFilter === 'device' &&
              (localTracks.length === 0 ? (
                <Text style={[styles.deviceEmpty, { color: theme.textSecondary }]}>
                  No device tracks imported yet. Tap “Import Files” to load MP3/M4A/WAV files from
                  your phone.
                </Text>
              ) : (
                localTracks.map((t) => (
                  <SongTile
                    key={t.id}
                    track={t}
                    isActive={currentTrack?.id === t.id}
                    showSourceBadge
                    onPress={() => playTrack(t, localTracks, 'Device Music')}
                    onMorePress={() =>
                      router.push({ pathname: '/track-options', params: { trackId: t.id } })
                    }
                  />
                ))
              ))}
          </View>
        )}

        {/* User Playlists */}
        {(activeFilter === 'all' || activeFilter === 'playlists') &&
          filteredPlaylists.map(renderPlaylistRow)}

        {/* Artists */}
        {(activeFilter === 'all' || activeFilter === 'artists') &&
          SEEDED_ARTISTS.map((artist) => (
            <Pressable
              key={artist.id}
              onPress={() => router.push(`/artist/${encodeURIComponent(artist.id)}`)}
              style={styles.libraryRow}
            >
              <TrackArtwork artworkAsset={artist.artworkAsset} size={64} circular />
              <View style={styles.rowMeta}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{artist.name}</Text>
                <Text style={[styles.rowSub, { color: theme.textSecondary }]}>Artist</Text>
              </View>
            </Pressable>
          ))}

        {/* Albums */}
        {(activeFilter === 'all' || activeFilter === 'albums') &&
          SEEDED_ALBUMS.map((album) => (
            <Pressable
              key={album.id}
              onPress={() => router.push(`/album/${encodeURIComponent(album.id)}`)}
              style={styles.libraryRow}
            >
              <TrackArtwork artworkAsset={album.artworkAsset} size={64} borderRadius={2} />
              <View style={styles.rowMeta}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{album.title}</Text>
                <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                  Album · {album.artist}
                </Text>
              </View>
            </Pressable>
          ))}
      </ScrollView>

      <PlaylistFormModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(pl) => router.push(`/playlist/${encodeURIComponent(pl.id)}`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 23,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  inlineSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: Radii.sm,
    gap: 8,
  },
  inlineInput: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 14,
  },
  chipsScroll: {
    maxHeight: 44,
    marginBottom: Spacing.sm,
  },
  chipsRow: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
    alignItems: 'center',
  },
  clearChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 28,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  profileTag: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  libraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
    gap: 14,
  },
  specialSquare: {
    width: 64,
    height: 64,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15.5,
  },
  subWithPin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rowSub: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
  },
  deviceCard: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14.5,
  },
  deviceBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  deviceActionPill: {
    backgroundColor: Palette.brandGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  deviceActionText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#121212',
  },
  deviceEmpty: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    lineHeight: 19,
  },
});
