import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Palette, Spacing } from '@/constants/theme';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme } from '@/store/useSettingsStore';

export default function QueueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const contextTitle = usePlayerStore((s) => s.contextTitle);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const moveQueueItem = usePlayerStore((s) => s.moveQueueItem);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearUpcomingQueue = usePlayerStore((s) => s.clearUpcomingQueue);

  const upcoming = queue
    .map((track, idx) => ({ track, idx }))
    .filter(({ idx }) => idx > currentIndex);

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      {/* Header matching Figma Album Radio 1:254 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeCircle} hitSlop={10}>
          <Ionicons name="close" size={20} color={Palette.white} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerKicker, { color: theme.textSecondary }]}>
            Playing from
          </Text>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {contextTitle || 'Queue'}
          </Text>
        </View>
        <Pressable onPress={clearUpcomingQueue} hitSlop={10}>
          <Text style={styles.clearBtn}>Clear</Text>
        </Pressable>
      </View>

      <FlatList
        data={upcoming}
        keyExtractor={({ track, idx }) => `${track.id}-${idx}`}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Now Playing</Text>
            {currentTrack && (
              <View style={styles.nowPlayingRow}>
                <TrackArtwork
                  artworkUrl={currentTrack.artworkUrl}
                  artworkAsset={currentTrack.artworkAsset}
                  dominantColor={currentTrack.dominantColor}
                  size={48}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nowTitle, { color: Palette.brandGreen }]} numberOfLines={1}>
                    {currentTrack.title}
                  </Text>
                  <Text style={[styles.nowSub, { color: theme.textSecondary }]} numberOfLines={1}>
                    {currentTrack.artist}
                  </Text>
                </View>
              </View>
            )}
            <Text style={[styles.sectionHeading, { color: theme.text, marginTop: 18 }]}>
              Next From: {contextTitle || 'Queue'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No upcoming tracks in queue. Add tracks from Search or Track Options.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.queueRow}>
            <Pressable
              onPress={() => playTrack(item.track, queue, contextTitle)}
              style={styles.queueMain}
            >
              <TrackArtwork
                artworkUrl={item.track.artworkUrl}
                artworkAsset={item.track.artworkAsset}
                size={42}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.qTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.track.title}
                </Text>
                <Text style={[styles.qSub, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.track.artist}
                </Text>
              </View>
            </Pressable>

            <View style={styles.reorderGroup}>
              <Pressable
                onPress={() => moveQueueItem(item.idx, Math.max(currentIndex + 1, item.idx - 1))}
                hitSlop={8}
              >
                <Ionicons name="chevron-up" size={18} color={theme.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => moveQueueItem(item.idx, Math.min(queue.length - 1, item.idx + 1))}
                hitSlop={8}
              >
                <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
              </Pressable>
              <Pressable onPress={() => removeFromQueue(item.idx)} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={19} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>
        )}
      />

      {/* Footer transport controls matching Figma 145:1687 */}
      <View
        style={[
          styles.footerControls,
          {
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      >
        <Pressable onPress={previous} hitSlop={10}>
          <Ionicons name="play-skip-back" size={26} color={theme.text} />
        </Pressable>
        <Pressable onPress={togglePlayPause} style={styles.playCircle}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={28}
            color="#121212"
            style={!isPlaying ? { marginLeft: 2 } : undefined}
          />
        </Pressable>
        <Pressable onPress={next} hitSlop={10}>
          <Ionicons name="play-skip-forward" size={26} color={theme.text} />
        </Pressable>
      </View>
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
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#282828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headerKicker: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  clearBtn: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Palette.brandGreen,
  },
  headerSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  sectionHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    marginBottom: Spacing.sm,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  nowTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  nowSub: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    marginTop: 2,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
  },
  queueMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14.5,
  },
  qSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    marginTop: 2,
  },
  reorderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    textAlign: 'center',
    padding: Spacing.xxl,
  },
  footerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 38,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  playCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
