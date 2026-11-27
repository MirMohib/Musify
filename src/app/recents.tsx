import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DockedMiniPlayerFooter } from '@/components/DockedMiniPlayerFooter';
import { AddToPlaylistModal } from '@/components/PlaylistModal';
import { SongTile } from '@/components/SongTile';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme } from '@/store/useSettingsStore';
import type { Track } from '@/types/music';

export default function RecentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const tracksById = useLibraryStore((s) => s.tracksById);
  const recentlyPlayedIds = useLibraryStore((s) => s.recentlyPlayedIds);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const shuffle = usePlayerStore((s) => s.shuffle);

  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const recentTracks = useMemo(
    () =>
      recentlyPlayedIds
        .map((id) => tracksById[id])
        .filter((track): track is Track => Boolean(track)),
    [recentlyPlayedIds, tracksById]
  );

  const handlePlayAll = async (wantShuffle = false) => {
    if (recentTracks.length === 0) return;
    if (shuffle !== wantShuffle) {
      toggleShuffle();
    }
    const startTrack = wantShuffle
      ? recentTracks[Math.floor(Math.random() * recentTracks.length)]
      : recentTracks[0];
    await playTrack(startTrack, recentTracks, 'Recents');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Recents</Text>
        <View style={{ width: 24 }} />
      </View>

      {recentTracks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={44} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing played recently</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Tracks, mixes, and radio stations you listen to will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={recentTracks}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.summaryRow}>
              <Text style={[styles.countText, { color: theme.textSecondary }]}>
                {recentTracks.length} {recentTracks.length === 1 ? 'track' : 'tracks'}
              </Text>
              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() => handlePlayAll(true)}
                  hitSlop={8}
                  style={styles.shuffleBtn}
                  accessibilityLabel="Shuffle recents"
                >
                  <Ionicons name="shuffle" size={20} color={Palette.brandGreen} />
                </Pressable>
                <Pressable
                  onPress={() => handlePlayAll(false)}
                  style={styles.playBtn}
                  accessibilityLabel="Play recents"
                >
                  <Ionicons name="play" size={18} color="#121212" />
                </Pressable>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <SongTile
              track={item}
              isActive={currentTrack?.id === item.id}
              showSourceBadge
              onPress={() => playTrack(item, recentTracks, 'Recents')}
              onMorePress={() => setSelectedTrack(item)}
            />
          )}
        />
      )}

      <DockedMiniPlayerFooter />

      <AddToPlaylistModal
        visible={Boolean(selectedTrack)}
        track={selectedTrack}
        onClose={() => setSelectedTrack(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
  },
  listContent: {
    paddingBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  countText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  shuffleBtn: {
    padding: 6,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: Radii.pill,
    backgroundColor: Palette.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    marginTop: Spacing.sm,
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
