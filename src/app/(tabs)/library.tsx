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

import { BottomSheetModal } from '@/components/BottomSheetModal';
import { PlaylistFormModal } from '@/components/PlaylistModal';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { SongTile } from '@/components/SongTile';
import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';
import type { Playlist } from '@/types/music';

type FilterChip = 'all' | 'playlists' | 'artists' | 'albums' | 'device' | 'downloads';

export default function LibraryScreen() {
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const profile = useSettingsStore((s) => s.profile);
  const openProfileDrawer = useSettingsStore((s) => s.openProfileDrawer);

  const tracksById = useLibraryStore((s) => s.tracksById);
  const playlists = useLibraryStore((s) => s.playlists);
  const likedTrackIds = useLibraryStore((s) => s.likedTrackIds);
  const isScanningDevice = useLibraryStore((s) => s.isScanningDevice);
  const deviceScanMessage = useLibraryStore((s) => s.deviceScanMessage);
  const importLocalMusic = useLibraryStore((s) => s.importLocalMusic);
  const rescanDeviceMusic = useLibraryStore((s) => s.rescanDeviceMusic);

  const downloads = useDownloadStore((s) => s.downloads);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playTrack = usePlayerStore((s) => s.playTrack);

  const activeFilter: FilterChip =
    filter === 'device' ||
    filter === 'playlists' ||
    filter === 'artists' ||
    filter === 'albums' ||
    filter === 'downloads'
      ? filter
      : 'all';

  const setActiveFilter = (next: FilterChip) => {
    router.setParams({ filter: next === 'all' ? undefined : next });
  };

  const [sortMode, setSortMode] = useState<'recent' | 'alpha'>('recent');
  const [gridView, setGridView] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const allTracks = useMemo(() => Object.values(tracksById), [tracksById]);

  const localTracks = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const list = allTracks.filter(
      (t) =>
        t.sourceId === 'local' &&
        (!q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
    );
    return sortMode === 'alpha' ? [...list].sort((a, b) => a.title.localeCompare(b.title)) : list;
  }, [allTracks, filterText, sortMode]);

  const downloadedTracks = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const list = Object.values(downloads)
      .filter((d) => d.status === 'completed')
      .map((d) => tracksById[d.trackId])
      .filter(
        (t): t is NonNullable<typeof t> =>
          Boolean(t) &&
          (!q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
      );
    return sortMode === 'alpha' ? [...list].sort((a, b) => a.title.localeCompare(b.title)) : list;
  }, [downloads, tracksById, filterText, sortMode]);

  const filteredPlaylists = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const list = playlists.filter((p) => !q || p.name.toLowerCase().includes(q));
    if (sortMode === 'alpha') {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [playlists, filterText, sortMode]);

  const libraryArtists = useMemo(() => {
    const map = new Map<string, { id: string; name: string; artworkUrl?: string; count: number }>();
    const q = filterText.trim().toLowerCase();
    for (const t of allTracks) {
      if (!t.artist) continue;
      if (q && !t.artist.toLowerCase().includes(q)) continue;
      const key = t.artist.toLowerCase();
      const prev = map.get(key);
      if (prev) {
        prev.count += 1;
        if (!prev.artworkUrl && (t.localArtworkUri || t.artworkUrl)) {
          prev.artworkUrl = t.localArtworkUri || t.artworkUrl;
        }
      } else {
        map.set(key, {
          id: t.artistId || t.artist,
          name: t.artist,
          artworkUrl: t.localArtworkUri || t.artworkUrl,
          count: 1,
        });
      }
    }
    const list = Array.from(map.values());
    return sortMode === 'alpha' ? list.sort((a, b) => a.name.localeCompare(b.name)) : list;
  }, [allTracks, filterText, sortMode]);

  const libraryAlbums = useMemo(() => {
    const map = new Map<
      string,
      { id: string; title: string; artist: string; artworkUrl?: string; count: number }
    >();
    const q = filterText.trim().toLowerCase();
    for (const t of allTracks) {
      if (!t.album) continue;
      if (q && !t.album.toLowerCase().includes(q)) continue;
      const key = t.albumId || t.album;
      const prev = map.get(key);
      if (prev) {
        prev.count += 1;
      } else {
        map.set(key, {
          id: key,
          title: t.album,
          artist: t.artist,
          artworkUrl: t.localArtworkUri || t.artworkUrl,
          count: 1,
        });
      }
    }
    const list = Array.from(map.values());
    return sortMode === 'alpha' ? list.sort((a, b) => a.title.localeCompare(b.title)) : list;
  }, [allTracks, filterText, sortMode]);

  const handleImportFiles = async () => {
    setShowCreateSheet(false);
    const res = await importLocalMusic();
    if (!res.canceled && res.imported.length > 0) {
      Alert.alert('Imported Audio', `Added ${res.imported.length} track(s) to Device Music.`);
    }
  };

  const handleRescanDevice = async () => {
    setShowCreateSheet(false);
    const res = await rescanDeviceMusic(true);
    if (res.message) {
      Alert.alert('Device Scan', res.message);
    } else {
      Alert.alert('Device Scan Complete', `Indexed ${res.count} local audio file(s).`);
    }
  };

  const renderPlaylistItem = (pl: Playlist) => {
    const firstTrack = pl.trackIds[0] ? tracksById[pl.trackIds[0]] : undefined;
    if (gridView) {
      return (
        <Pressable
          key={pl.id}
          onPress={() => router.push(`/playlist/${encodeURIComponent(pl.id)}`)}
          style={styles.gridItem}
        >
          <TrackArtwork
            artworkUrl={pl.artworkUrl ?? firstTrack?.artworkUrl}
            localArtworkUri={firstTrack?.localArtworkUri}
            dominantColor={firstTrack?.dominantColor}
            size={106}
            borderRadius={4}
          />
          <Text style={[styles.gridTitle, { color: theme.text }]} numberOfLines={1}>
            {pl.name}
          </Text>
          <Text style={[styles.gridSub, { color: theme.textSecondary }]} numberOfLines={1}>
            Playlist · {pl.trackIds.length}
          </Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        key={pl.id}
        onPress={() => router.push(`/playlist/${encodeURIComponent(pl.id)}`)}
        style={styles.libraryRow}
      >
        <TrackArtwork
          artworkUrl={pl.artworkUrl ?? firstTrack?.artworkUrl}
          localArtworkUri={firstTrack?.localArtworkUri}
          dominantColor={firstTrack?.dominantColor}
          size={62}
          borderRadius={4}
        />
        <View style={styles.rowMeta}>
          <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
            {pl.name}
          </Text>
          <Text style={[styles.rowSub, { color: theme.textSecondary }]} numberOfLines={1}>
            Playlist · {pl.owner} · {pl.trackIds.length} {pl.trackIds.length === 1 ? 'song' : 'songs'}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      {/* Header matching Spotify Your Library */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ProfileAvatar size={34} onPress={openProfileDrawer} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>Your Library</Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setShowSearch((v) => !v)}
            hitSlop={10}
            accessibilityLabel="Filter library"
          >
            <Ionicons name="search" size={23} color={theme.text} />
          </Pressable>
          <Pressable
            onPress={() => setShowCreateSheet(true)}
            hitSlop={10}
            accessibilityLabel="Create playlist or import local music"
          >
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
            placeholder="Filter playlists, artists, albums, or downloads"
            placeholderTextColor={theme.textSecondary}
            style={[styles.inlineInput, { color: theme.text }]}
          />
          {filterText.length > 0 && (
            <Pressable onPress={() => setFilterText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
      )}

      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        {activeFilter !== 'all' && (
          <Pressable
            onPress={() => setActiveFilter('all')}
            style={[styles.clearChip, { borderColor: theme.border, backgroundColor: theme.surfaceElevated }]}
            accessibilityLabel="Clear filter"
          >
            <Ionicons name="close" size={16} color={theme.text} />
          </Pressable>
        )}
        {(
          [
            { id: 'playlists', label: 'Playlists' },
            { id: 'albums', label: 'Albums' },
            { id: 'artists', label: 'Artists' },
            { id: 'device', label: 'Device' },
            { id: 'downloads', label: 'Downloads' },
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
                  backgroundColor: active ? Palette.brandGreen : theme.surfaceElevated,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? '#121212' : theme.text }]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {/* Sort & View Toggle Row */}
        <View style={styles.sortRow}>
          <Pressable
            onPress={() => setSortMode((m) => (m === 'recent' ? 'alpha' : 'recent'))}
            style={styles.sortBtn}
          >
            <Ionicons name="swap-vertical" size={15} color={theme.text} />
            <Text style={[styles.sortText, { color: theme.text }]}>
              {sortMode === 'recent' ? 'Recents' : 'Alphabetical'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setGridView((v) => !v)}
            hitSlop={10}
            accessibilityLabel={gridView ? 'Switch to list view' : 'Switch to grid view'}
          >
            <Ionicons
              name={gridView ? 'list-outline' : 'grid-outline'}
              size={19}
              color={theme.text}
            />
          </Pressable>
        </View>

        {/* All / Playlists View */}
        {(activeFilter === 'all' || activeFilter === 'playlists') && (
          <View style={gridView ? styles.gridWrap : undefined}>
            {/* Liked Songs */}
            {gridView ? (
              <Pressable
                onPress={() => router.push('/playlist/liked')}
                style={styles.gridItem}
              >
                <LinearGradient
                  colors={[Palette.likedGradientStart, Palette.likedGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.specialSquare, { width: 106, height: 106 }]}
                >
                  <Ionicons name="heart" size={38} color={Palette.white} />
                </LinearGradient>
                <Text style={[styles.gridTitle, { color: theme.text }]} numberOfLines={1}>
                  Liked Songs
                </Text>
                <Text style={[styles.gridSub, { color: theme.textSecondary }]} numberOfLines={1}>
                  {likedTrackIds.length} songs
                </Text>
              </Pressable>
            ) : (
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
                  <Ionicons name="heart" size={24} color={Palette.white} />
                </LinearGradient>
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>Liked Songs</Text>
                  <View style={styles.subWithPin}>
                    <Ionicons name="pin" size={12} color={Palette.brandGreen} />
                    <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                      Playlist · {profile.name} · {likedTrackIds.length} {likedTrackIds.length === 1 ? 'song' : 'songs'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            )}

            {/* User Playlists */}
            {filteredPlaylists.map(renderPlaylistItem)}

            {/* Compact Downloads & Device rows on All view */}
            {activeFilter === 'all' && !gridView && (
              <>
                <Pressable onPress={() => router.push('/downloads')} style={styles.libraryRow}>
                  <View style={[styles.specialSquare, { backgroundColor: Palette.episodesBg }]}>
                    <Ionicons name="arrow-down-circle" size={26} color={Palette.white} />
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={[styles.rowTitle, { color: theme.text }]}>Downloads</Text>
                    <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                      Offline · {downloadedTracks.length} {downloadedTracks.length === 1 ? 'track' : 'tracks'}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setActiveFilter('device')}
                  style={styles.libraryRow}
                >
                  <View style={[styles.specialSquare, { backgroundColor: theme.surfaceElevated }]}>
                    <Ionicons name="phone-portrait-outline" size={26} color={Palette.brandGreen} />
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={[styles.rowTitle, { color: theme.text }]}>Device Music</Text>
                    <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                      Local · {localTracks.length} {localTracks.length === 1 ? 'file' : 'files'}
                    </Text>
                  </View>
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* Device Filter View */}
        {activeFilter === 'device' && (
          <View>
            <View style={styles.deviceActionRow}>
              <Pressable
                onPress={handleRescanDevice}
                disabled={isScanningDevice}
                style={[styles.deviceActionBtn, { backgroundColor: theme.surfaceElevated }]}
              >
                {isScanningDevice ? (
                  <ActivityIndicator size="small" color={Palette.brandGreen} />
                ) : (
                  <Ionicons name="refresh" size={16} color={theme.text} />
                )}
                <Text style={[styles.deviceActionLabel, { color: theme.text }]}>
                  Rescan Device
                </Text>
              </Pressable>

              <Pressable
                onPress={handleImportFiles}
                style={[styles.deviceActionBtn, { backgroundColor: Palette.brandGreen }]}
              >
                <Ionicons name="folder-open-outline" size={16} color="#121212" />
                <Text style={[styles.deviceActionLabel, { color: '#121212' }]}>
                  Import Audio
                </Text>
              </Pressable>
            </View>

            {localTracks.length === 0 ? (
              <Text style={[styles.emptySection, { color: theme.textSecondary }]}>
                {deviceScanMessage ||
                  'No local audio files indexed yet. Tap "Rescan Device" or "Import Audio".'}
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
            )}
          </View>
        )}

        {/* Downloads Filter View */}
        {activeFilter === 'downloads' && (
          <View>
            <Pressable
              onPress={() => router.push('/downloads')}
              style={[styles.manageStorageBanner, { backgroundColor: theme.surfaceElevated }]}
            >
              <Ionicons name="cloud-done-outline" size={18} color={Palette.brandGreen} />
              <Text style={[styles.manageStorageText, { color: theme.text }]}>
                Open Download Manager &amp; Storage Settings
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>

            {downloadedTracks.length === 0 ? (
              <Text style={[styles.emptySection, { color: theme.textSecondary }]}>
                No downloaded tracks yet. Open any track&apos;s options (···) to save offline.
              </Text>
            ) : (
              downloadedTracks.map((t) => (
                <SongTile
                  key={t.id}
                  track={t}
                  isActive={currentTrack?.id === t.id}
                  showSourceBadge
                  onPress={() => playTrack(t, downloadedTracks, 'Downloads')}
                  onMorePress={() =>
                    router.push({ pathname: '/track-options', params: { trackId: t.id } })
                  }
                />
              ))
            )}
          </View>
        )}

        {/* Dynamic Artists (All view stays crisp; Artists filter shows full list/grid) */}
        {activeFilter === 'artists' &&
          (libraryArtists.length === 0 ? (
            <Text style={[styles.emptySection, { color: theme.textSecondary }]}>
              Artists from your played, downloaded, and device tracks will appear here.
            </Text>
          ) : (
            <View style={gridView ? styles.gridWrap : undefined}>
              {libraryArtists.map((artist) =>
                gridView ? (
                  <Pressable
                    key={artist.id}
                    onPress={() =>
                      router.push({
                        pathname: '/artist/[id]',
                        params: { id: artist.id, name: artist.name },
                      })
                    }
                    style={styles.gridItem}
                  >
                    <TrackArtwork artworkUrl={artist.artworkUrl} size={106} circular />
                    <Text
                      style={[styles.gridTitle, { color: theme.text, textAlign: 'center' }]}
                      numberOfLines={1}
                    >
                      {artist.name}
                    </Text>
                    <Text
                      style={[styles.gridSub, { color: theme.textSecondary, textAlign: 'center' }]}
                      numberOfLines={1}
                    >
                      Artist
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    key={artist.id}
                    onPress={() =>
                      router.push({
                        pathname: '/artist/[id]',
                        params: { id: artist.id, name: artist.name },
                      })
                    }
                    style={styles.libraryRow}
                  >
                    <TrackArtwork artworkUrl={artist.artworkUrl} size={62} circular />
                    <View style={styles.rowMeta}>
                      <Text style={[styles.rowTitle, { color: theme.text }]}>{artist.name}</Text>
                      <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                        Artist · {artist.count} {artist.count === 1 ? 'track' : 'tracks'}
                      </Text>
                    </View>
                  </Pressable>
                )
              )}
            </View>
          ))}

        {/* Dynamic Albums */}
        {(activeFilter === 'albums' || (activeFilter === 'all' && libraryAlbums.length > 0 && !gridView)) &&
          (activeFilter === 'albums' && libraryAlbums.length === 0 ? (
            <Text style={[styles.emptySection, { color: theme.textSecondary }]}>
              Albums from your library and device music will appear here.
            </Text>
          ) : (
            <View style={gridView ? styles.gridWrap : undefined}>
              {(activeFilter === 'all' ? libraryAlbums.slice(0, 6) : libraryAlbums).map((album) =>
                gridView ? (
                  <Pressable
                    key={album.id}
                    onPress={() =>
                      router.push({
                        pathname: '/album/[id]',
                        params: { id: album.id, title: album.title, artist: album.artist },
                      })
                    }
                    style={styles.gridItem}
                  >
                    <TrackArtwork artworkUrl={album.artworkUrl} size={106} borderRadius={4} />
                    <Text style={[styles.gridTitle, { color: theme.text }]} numberOfLines={1}>
                      {album.title}
                    </Text>
                    <Text style={[styles.gridSub, { color: theme.textSecondary }]} numberOfLines={1}>
                      Album · {album.artist}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    key={album.id}
                    onPress={() =>
                      router.push({
                        pathname: '/album/[id]',
                        params: { id: album.id, title: album.title, artist: album.artist },
                      })
                    }
                    style={styles.libraryRow}
                  >
                    <TrackArtwork artworkUrl={album.artworkUrl} size={62} borderRadius={4} />
                    <View style={styles.rowMeta}>
                      <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                        {album.title}
                      </Text>
                      <Text style={[styles.rowSub, { color: theme.textSecondary }]} numberOfLines={1}>
                        Album · {album.artist}
                      </Text>
                    </View>
                  </Pressable>
                )
              )}
            </View>
          ))}
      </ScrollView>

      {/* + Create Bottom Sheet */}
      <BottomSheetModal
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        maxHeight="50%"
      >
        <View style={styles.createSheetContent}>
          <Pressable
            onPress={() => {
              setShowCreateSheet(false);
              setShowCreateModal(true);
            }}
            style={styles.createOptionRow}
          >
            <View style={[styles.createIconCircle, { backgroundColor: theme.surfaceElevated }]}>
              <Ionicons name="musical-notes-outline" size={22} color={theme.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.createOptionTitle, { color: theme.text }]}>Playlist</Text>
              <Text style={[styles.createOptionSub, { color: theme.textSecondary }]}>
                Build a playlist with songs from any source
              </Text>
            </View>
          </Pressable>

          <Pressable onPress={handleImportFiles} style={styles.createOptionRow}>
            <View style={[styles.createIconCircle, { backgroundColor: theme.surfaceElevated }]}>
              <Ionicons name="folder-open-outline" size={22} color={theme.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.createOptionTitle, { color: theme.text }]}>
                Import Local Music
              </Text>
              <Text style={[styles.createOptionSub, { color: theme.textSecondary }]}>
                Add MP3, M4A, WAV, or FLAC files from Files app
              </Text>
            </View>
          </Pressable>

          <Pressable onPress={handleRescanDevice} style={styles.createOptionRow}>
            <View style={[styles.createIconCircle, { backgroundColor: theme.surfaceElevated }]}>
              <Ionicons name="phone-portrait-outline" size={22} color={theme.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.createOptionTitle, { color: theme.text }]}>
                Scan Device Audio
              </Text>
              <Text style={[styles.createOptionSub, { color: theme.textSecondary }]}>
                Refresh local music indexed on this device
              </Text>
            </View>
          </Pressable>
        </View>
      </BottomSheetModal>

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
    gap: 18,
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
    maxHeight: 42,
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
  libraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    gap: 14,
  },
  specialSquare: {
    width: 62,
    height: 62,
    borderRadius: 4,
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
    fontSize: 12.5,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: 14,
    paddingTop: Spacing.xs,
  },
  gridItem: {
    width: 106,
    gap: 5,
  },
  gridTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
  gridSub: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
  },
  deviceActionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  deviceActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radii.pill,
  },
  deviceActionLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  manageStorageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radii.md,
  },
  manageStorageText: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 13.5,
  },
  emptySection: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    lineHeight: 20,
  },
  createSheetContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: 14,
  },
  createOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  createIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createOptionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  createOptionSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    marginTop: 2,
  },
});
