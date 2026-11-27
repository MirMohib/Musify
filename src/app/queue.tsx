import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SleepTimerSheet } from '@/components/SleepTimerSheet';
import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
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
  const shuffle = usePlayerStore((s) => s.shuffle);
  const sleepTimerMode = usePlayerStore((s) => s.sleepTimerMode);

  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const moveQueueItem = usePlayerStore((s) => s.moveQueueItem);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearUpcomingQueue = usePlayerStore((s) => s.clearUpcomingQueue);

  const [timerOpen, setTimerOpen] = useState(false);

  const upcoming = queue
    .map((track, idx) => ({ track, idx }))
    .filter(({ idx }) => idx > currentIndex);

  const sheetBg = theme.isDark ? '#1B1B1B' : theme.surface;
  const tileBg = theme.isDark ? '#2A2A2A' : theme.surfaceElevated;
  const timerActive = sleepTimerMode !== 'off';

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={styles.dismissArea}
        onPress={() => router.back()}
        accessibilityLabel="Close queue"
      />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: sheetBg,
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        <View
          style={[
            styles.handle,
            { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.22)' },
          ]}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Queue</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]} numberOfLines={1}>
              Playing {contextTitle || currentTrack?.album || 'Queue'}
            </Text>
          </View>

          {upcoming.length > 0 && (
            <Pressable onPress={clearUpcomingQueue} hitSlop={10}>
              <Text style={styles.clearBtn}>Clear</Text>
            </Pressable>
          )}
        </View>

        <FlatList
          data={upcoming}
          keyExtractor={({ track, idx }) => `${track.id}-${idx}`}
          windowSize={7}
          maxToRenderPerBatch={8}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS !== 'web'}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerSection}>
              {currentTrack && (
                <View style={styles.nowPlayingRow}>
                  <TrackArtwork
                    artworkUrl={currentTrack.artworkUrl}
                    localArtworkUri={currentTrack.localArtworkUri}
                    artworkAsset={currentTrack.artworkAsset}
                    dominantColor={currentTrack.dominantColor}
                    size={46}
                    borderRadius={4}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nowTitle, { color: Palette.brandGreen }]} numberOfLines={1}>
                      {currentTrack.title}
                    </Text>
                    <Text style={[styles.nowSub, { color: theme.textSecondary }]} numberOfLines={1}>
                      {currentTrack.artist}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      togglePlayPause();
                    }}
                    style={[
                      styles.nowPlayBtn,
                      { backgroundColor: theme.isDark ? Palette.white : theme.text },
                    ]}
                    accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={18}
                      color={theme.isDark ? '#121212' : Palette.white}
                      style={!isPlaying ? { marginLeft: 2 } : undefined}
                    />
                  </Pressable>
                </View>
              )}

              <View style={styles.nextHeaderRow}>
                {shuffle && (
                  <Ionicons name="shuffle" size={16} color={theme.textSecondary} />
                )}
                <Text style={[styles.sectionHeading, { color: theme.textSecondary }]}>
                  {shuffle ? 'Shuffling from:' : `Next from: ${contextTitle || 'Queue'}`}
                </Text>
              </View>
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
                  localArtworkUri={item.track.localArtworkUri}
                  artworkAsset={item.track.artworkAsset}
                  dominantColor={item.track.dominantColor}
                  size={44}
                  borderRadius={4}
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
                  accessibilityLabel="Move track up"
                >
                  <Ionicons name="chevron-up" size={18} color={theme.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => moveQueueItem(item.idx, Math.min(queue.length - 1, item.idx + 1))}
                  hitSlop={8}
                  accessibilityLabel="Move track down"
                >
                  <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => removeFromQueue(item.idx)}
                  hitSlop={8}
                  accessibilityLabel="Remove from queue"
                >
                  <Ionicons name="reorder-three" size={22} color={theme.textSecondary} />
                </Pressable>
              </View>
            </View>
          )}
        />

        {/* Sticky Bottom Shuffle + Timer Bar */}
        <View style={[styles.bottomBar, { borderTopColor: theme.border }]}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              toggleShuffle();
            }}
            style={[styles.bottomCardBtn, { backgroundColor: tileBg }]}
            accessibilityLabel={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
          >
            <Ionicons
              name="shuffle"
              size={22}
              color={shuffle ? Palette.brandGreen : theme.text}
            />
            <Text
              style={[
                styles.bottomBtnLabel,
                { color: shuffle ? Palette.brandGreen : theme.textSecondary },
              ]}
            >
              Shuffle
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setTimerOpen(true);
            }}
            style={[styles.bottomCardBtn, { backgroundColor: tileBg }]}
            accessibilityLabel="Sleep timer"
          >
            <Ionicons
              name="timer-outline"
              size={22}
              color={timerActive ? Palette.brandGreen : theme.text}
            />
            <Text
              style={[
                styles.bottomBtnLabel,
                { color: timerActive ? Palette.brandGreen : theme.textSecondary },
              ]}
            >
              Timer
            </Text>
          </Pressable>
        </View>
      </View>

      <SleepTimerSheet
        visible={timerOpen}
        onClose={() => setTimerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    height: '76%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    overflow: 'hidden',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
  },
  headerSub: {
    fontFamily: FontFamily.medium,
    fontSize: 13.5,
    marginTop: 2,
  },
  clearBtn: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Palette.brandGreen,
  },
  headerSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 6,
    paddingBottom: 6,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
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
  nowPlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  nextHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  sectionHeading: {
    fontFamily: FontFamily.medium,
    fontSize: 13.5,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
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
    gap: 10,
    marginLeft: 8,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    textAlign: 'center',
    padding: Spacing.xxl,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomCardBtn: {
    flex: 1,
    height: 60,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bottomBtnLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
});
