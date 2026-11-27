import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SeekSlider } from '@/components/SeekSlider';
import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Palette, Radii, Shadows, Spacing } from '@/constants/theme';
import { isTrackDownloadable } from '@/services/sources/sourceRegistry';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { getSourceLabel } from '@/utils/format';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Isolated seek bar wrapper so 250ms audio timer updates only re-render SeekSlider,
 * keeping FullPlayerScreen artwork, gradients, and buttons completely stable.
 */
const PlayerSeekSection = React.memo(function PlayerSeekSection() {
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const seekTo = usePlayerStore((s) => s.seekTo);

  return <SeekSlider positionMs={positionMs} durationMs={durationMs} onSeek={seekTo} />;
});

export default function FullPlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const contextTitle = usePlayerStore((s) => s.contextTitle);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const activeDeviceName = usePlayerStore((s) => s.activeDeviceName);

  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeatMode = usePlayerStore((s) => s.cycleRepeatMode);

  const likedTrackIds = useLibraryStore((s) => s.likedTrackIds);
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  const downloadRecord = useDownloadStore((s) =>
    currentTrack ? s.downloads[currentTrack.id] : undefined
  );
  const downloadTrack = useDownloadStore((s) => s.downloadTrack);
  const pauseDownload = useDownloadStore((s) => s.pauseDownload);
  const resumeDownload = useDownloadStore((s) => s.resumeDownload);

  const [lyricsExpanded, setLyricsExpanded] = useState(false);

  if (!currentTrack) {
    return (
      <View style={[styles.emptyRoot, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={28} color={Palette.white} />
        </Pressable>
        <Text style={styles.emptyText}>Nothing playing right now.</Text>
      </View>
    );
  }

  const isLiked = likedTrackIds.includes(currentTrack.id);
  const topColor = currentTrack.dominantColor || Palette.playerGradientTop;
  const artSize = Math.min(SCREEN_WIDTH - 52, 380);

  const canDownload = isTrackDownloadable(currentTrack);
  const isDownloaded = downloadRecord?.status === 'completed';
  const isDownloading = downloadRecord?.status === 'downloading';
  const isPaused = downloadRecord?.status === 'paused';

  const handleDownloadPress = async () => {
    Haptics.selectionAsync().catch(() => {});
    try {
      if (isDownloading) {
        await pauseDownload(currentTrack.id);
      } else if (isPaused) {
        await resumeDownload(currentTrack);
      } else if (!isDownloaded) {
        await downloadTrack(currentTrack);
      } else {
        router.push('/downloads');
      }
    } catch (err) {
      Alert.alert(
        'Download Failed',
        err instanceof Error ? err.message : 'Unable to download this track.'
      );
    }
  };

  return (
    <LinearGradient
      colors={[topColor, '#4A120D', '#2A0806']}
      locations={[0, 0.5, 1]}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Minimize player">
            <Ionicons name="chevron-down" size={26} color={Palette.white} />
          </Pressable>
          <View style={styles.contextWrap}>
            <Text style={styles.contextLabel} numberOfLines={1}>
              {contextTitle || currentTrack.album || 'Now Playing'}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              router.push({ pathname: '/track-options', params: { trackId: currentTrack.id } })
            }
            hitSlop={12}
            accessibilityLabel="Track options"
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={Palette.white} />
          </Pressable>
        </View>

        <View style={[styles.artworkWrap, Shadows.artwork]}>
          <TrackArtwork
            artworkUrl={currentTrack.artworkUrl}
            artworkAsset={currentTrack.artworkAsset}
            dominantColor={currentTrack.dominantColor}
            size={artSize}
            borderRadius={4}
          />
        </View>

        {/* Track Title + Artist + Download + Heart */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/artist/[id]',
                  params: {
                    id: currentTrack.artistId || currentTrack.artist,
                    name: currentTrack.artist,
                  },
                })
              }
            >
              <Text style={styles.trackArtist} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </Pressable>
          </View>

          <View style={styles.titleActions}>
            {canDownload && (
              <Pressable
                onPress={handleDownloadPress}
                hitSlop={10}
                style={styles.dlBtn}
                accessibilityLabel={isDownloaded ? 'Downloaded' : 'Download track'}
              >
                {isDownloading ? (
                  <View style={styles.dlProgressWrap}>
                    <ActivityIndicator size="small" color={Palette.brandGreen} />
                    <Text style={styles.dlPct}>
                      {Math.round((downloadRecord?.progress ?? 0) * 100)}%
                    </Text>
                  </View>
                ) : isDownloaded ? (
                  <Ionicons name="checkmark-circle" size={24} color={Palette.brandGreen} />
                ) : isPaused ? (
                  <Ionicons name="pause-circle-outline" size={24} color={Palette.warning} />
                ) : (
                  <Ionicons name="arrow-down-circle-outline" size={24} color={Palette.white} />
                )}
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                toggleLike(currentTrack);
              }}
              hitSlop={10}
              accessibilityLabel={isLiked ? 'Unlike song' : 'Like song'}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={25}
                color={isLiked ? Palette.brandGreen : Palette.white}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.sliderWrap}>
          <PlayerSeekSection />
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              toggleShuffle();
            }}
            hitSlop={10}
            accessibilityLabel="Shuffle"
          >
            <Ionicons
              name="shuffle"
              size={24}
              color={shuffle ? Palette.brandGreen : Palette.white}
            />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              previous();
            }}
            hitSlop={10}
            accessibilityLabel="Previous track"
          >
            <Ionicons name="play-skip-back" size={34} color={Palette.white} />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              togglePlayPause();
            }}
            style={styles.playCircle}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color="#2A0806"
              style={!isPlaying ? { marginLeft: 3 } : undefined}
            />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              next();
            }}
            hitSlop={10}
            accessibilityLabel="Next track"
          >
            <Ionicons name="play-skip-forward" size={34} color={Palette.white} />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              cycleRepeatMode();
            }}
            hitSlop={10}
            style={styles.repeatBtn}
            accessibilityLabel={`Repeat mode: ${repeatMode}`}
          >
            <Ionicons
              name="repeat"
              size={25}
              color={repeatMode !== 'off' ? Palette.brandGreen : Palette.white}
            />
            {repeatMode !== 'off' && (
              <View style={styles.repeatDot}>
                {repeatMode === 'one' && <Text style={styles.repeatOne}>1</Text>}
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.bottomActions}>
          <Pressable
            onPress={() => router.push('/devices')}
            style={styles.deviceBtn}
            hitSlop={10}
          >
            <Ionicons name="bluetooth" size={16} color={Palette.brandGreenMuted} />
            <Text style={styles.deviceLabel}>{activeDeviceName.toUpperCase()}</Text>
          </Pressable>

          <View style={styles.rightUtilityIcons}>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/share', params: { trackId: currentTrack.id } })
              }
              hitSlop={10}
            >
              <Ionicons name="share-outline" size={21} color={Palette.white} />
            </Pressable>
            <Pressable onPress={() => router.push('/queue')} hitSlop={10}>
              <Ionicons name="list" size={22} color={Palette.white} />
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => setLyricsExpanded((v) => !v)}
          style={styles.lyricsCard}
        >
          <View style={styles.lyricsHeader}>
            <Text style={styles.lyricsTitle}>Track Info &amp; Lyrics</Text>
            <View style={styles.morePill}>
              <Text style={styles.morePillText}>
                {lyricsExpanded ? 'LESS' : 'MORE'}
              </Text>
              <Ionicons
                name={lyricsExpanded ? 'contract-outline' : 'expand-outline'}
                size={12}
                color={Palette.white}
              />
            </View>
          </View>

          {lyricsExpanded && (
            <View style={styles.lyricsBody}>
              <Text style={styles.lyricsText}>
                {currentTrack.lyricsPreview ||
                  `Source: ${getSourceLabel(currentTrack.sourceId)}\nLicense: ${
                    currentTrack.license || 'Audio Stream'
                  }\n${
                    canDownload
                      ? 'Offline Download: Supported (Creative Commons / Free)'
                      : 'Offline Download: Streaming / Local only'
                  }`}
              </Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  emptyRoot: {
    flex: 1,
    backgroundColor: Palette.bgDarkest,
    padding: Spacing.lg,
  },
  emptyText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: Palette.white,
    marginTop: 40,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 26,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  contextWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  contextLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13.5,
    color: Palette.white,
  },
  artworkWrap: {
    alignSelf: 'center',
    marginBottom: 30,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 21,
    color: Palette.white,
    letterSpacing: -0.4,
  },
  trackArtist: {
    fontFamily: FontFamily.medium,
    fontSize: 15.5,
    color: Palette.mutedText,
    marginTop: 3,
  },
  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dlProgressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dlPct: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Palette.brandGreen,
  },
  sliderWrap: {
    marginTop: 18,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  playCircle: {
    width: 67,
    height: 67,
    borderRadius: 34,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  repeatDot: {
    position: 'absolute',
    bottom: -7,
    minWidth: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOne: {
    fontSize: 8,
    fontFamily: FontFamily.bold,
    color: '#121212',
    paddingHorizontal: 2,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
  },
  deviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
    color: Palette.brandGreenMuted,
    letterSpacing: 0.4,
  },
  rightUtilityIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  lyricsCard: {
    marginTop: 22,
    backgroundColor: Palette.lyricsCardOrange,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  lyricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lyricsTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 17,
    color: Palette.white,
  },
  morePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.lyricsPillBrown,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 21,
  },
  morePillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10.5,
    color: Palette.white,
  },
  lyricsBody: {
    marginTop: 14,
  },
  lyricsText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15.5,
    lineHeight: 24,
    color: Palette.white,
  },
});
