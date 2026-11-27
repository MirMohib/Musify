import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ArtworkColorSampler } from '@/components/ArtworkColorSampler';
import { AddToPlaylistModal } from '@/components/PlaylistModal';
import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Layout, Palette, Radii, Spacing } from '@/constants/theme';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme } from '@/store/useSettingsStore';
import { buildDynamicPlayerGradient } from '@/utils/colorUtils';
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
  const theme = useAppTheme();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);

  const likedTrackIds = useLibraryStore((s) => s.likedTrackIds);
  const playlists = useLibraryStore((s) => s.playlists);

  const [savedInOpen, setSavedInOpen] = useState(false);

  if (!currentTrack) return null;

  const isSaved =
    likedTrackIds.includes(currentTrack.id) ||
    playlists.some((p) => p.trackIds.includes(currentTrack.id));

  const bgTint = currentTrack.dominantColor
    ? hexWithAlpha(
        buildDynamicPlayerGradient(
          currentTrack.dominantColor,
          theme.miniPlayerDefault,
          theme.background
        ).top,
        0.96
      )
    : theme.miniPlayerDefault;

  return (
    <>
      <ArtworkColorSampler track={currentTrack} />
      <Pressable
        onPress={() => router.push('/player')}
        style={[styles.container, { backgroundColor: bgTint }]}
        accessibilityRole="button"
        accessibilityLabel={`Now playing ${currentTrack.title} by ${currentTrack.artist}. Tap to expand player.`}
      >
        <View style={styles.contentRow}>
          <TrackArtwork
            artworkUrl={currentTrack.artworkUrl}
            localArtworkUri={currentTrack.localArtworkUri}
            artworkAsset={currentTrack.artworkAsset}
            dominantColor={currentTrack.dominantColor}
            size={40}
            borderRadius={4}
            style={styles.artwork}
          />

          <View style={styles.meta}>
            <Text numberOfLines={1} style={styles.title}>
              {currentTrack.title}
            </Text>
            <Text numberOfLines={1} style={styles.artist}>
              {currentTrack.artist}
            </Text>
          </View>

          <View style={styles.controls}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                router.push('/devices');
              }}
              hitSlop={10}
              style={styles.iconBtn}
              accessibilityLabel="Connect to a device"
            >
              <Ionicons name="phone-portrait-outline" size={20} color={Palette.white} />
            </Pressable>

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setSavedInOpen(true);
              }}
              hitSlop={10}
              style={styles.iconBtn}
              accessibilityLabel={isSaved ? 'Manage saved playlists' : 'Save to library or playlist'}
            >
              <Ionicons
                name={isSaved ? 'checkmark-circle' : 'add-circle-outline'}
                size={22}
                color={isSaved ? Palette.brandGreen : Palette.white}
              />
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
                size={23}
                color={Palette.white}
              />
            </Pressable>
          </View>
        </View>

        <MiniPlayerProgress />
      </Pressable>

      <AddToPlaylistModal
        visible={savedInOpen}
        track={currentTrack}
        onClose={() => setSavedInOpen(false)}
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    height: Layout.miniPlayerHeight,
    marginHorizontal: Spacing.sm,
    marginBottom: 4,
    borderRadius: Radii.lg,
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
    gap: 1,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    color: Palette.white,
    fontSize: 13.5,
  },
  artist: {
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: Spacing.sm,
  },
  iconBtn: {
    padding: 3,
  },
  progressTrack: {
    height: 2,
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
