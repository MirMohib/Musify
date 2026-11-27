import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Layout, Palette, Radii, Spacing } from '@/constants/theme';
import { usePlayerStore } from '@/store/usePlayerStore';
import { hexWithAlpha } from '@/utils/format';

/**
 * Isolated progress bar so 250ms playback position updates do NOT re-render
 * the entire MiniPlayer artwork, text, or icons.
 */
const MiniPlayerProgress = React.memo(function MiniPlayerProgress() {
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);

  const progress =
    durationMs > 0 ? Math.max(0, Math.min(1, positionMs / durationMs)) : 0;

  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
    </View>
  );
});

export const MiniPlayer = React.memo(function MiniPlayer() {
  const router = useRouter();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const activeDeviceName = usePlayerStore((s) => s.activeDeviceName);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);

  if (!currentTrack) return null;

  const bgTint = currentTrack.dominantColor
    ? hexWithAlpha(currentTrack.dominantColor, 0.92)
    : '#3A1D21';

  return (
    <Pressable
      onPress={() => router.push('/player')}
      style={[styles.container, { backgroundColor: bgTint }]}
      accessibilityRole="button"
      accessibilityLabel={`Now playing ${currentTrack.title} by ${currentTrack.artist}. Tap to expand player.`}
    >
      <View style={styles.contentRow}>
        <TrackArtwork
          artworkUrl={currentTrack.artworkUrl}
          artworkAsset={currentTrack.artworkAsset}
          dominantColor={currentTrack.dominantColor}
          size={38}
          borderRadius={6}
          style={styles.artwork}
        />

        <View style={styles.meta}>
          <Text numberOfLines={1} style={styles.titleLine}>
            <Text style={styles.title}>{currentTrack.title}</Text>
            <Text style={styles.dot}> • </Text>
            <Text style={styles.artist}>{currentTrack.artist}</Text>
          </Text>

          <View style={styles.deviceRow}>
            <Ionicons name="bluetooth" size={11} color={Palette.brandGreenActive} />
            <Text numberOfLines={1} style={styles.deviceText}>
              {activeDeviceName.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              router.push('/devices');
            }}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityLabel="Output device"
          >
            <Ionicons name="bluetooth" size={20} color={Palette.brandGreenActive} />
          </Pressable>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              togglePlayPause();
            }}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color={Palette.white}
            />
          </Pressable>
        </View>
      </View>

      <MiniPlayerProgress />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    height: Layout.miniPlayerHeight,
    marginHorizontal: Spacing.sm,
    marginBottom: 4,
    borderRadius: Radii.md,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  artwork: {
    marginRight: 10,
  },
  meta: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  titleLine: {
    fontSize: 13.5,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    color: Palette.white,
    fontSize: 13.5,
  },
  dot: {
    color: Palette.mutedText,
    fontSize: 12,
  },
  artist: {
    fontFamily: FontFamily.medium,
    color: Palette.mutedText,
    fontSize: 12,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deviceText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Palette.brandGreenActive,
    letterSpacing: 0.4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginLeft: Spacing.sm,
  },
  iconBtn: {
    padding: 4,
  },
  progressTrack: {
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 10,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Palette.white,
    borderRadius: 2,
  },
});
