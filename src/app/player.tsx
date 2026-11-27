import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtworkColorSampler } from '@/components/ArtworkColorSampler';
import { AddToPlaylistModal } from '@/components/PlaylistModal';
import { SeekSlider } from '@/components/SeekSlider';
import { SleepTimerSheet } from '@/components/SleepTimerSheet';
import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Palette, Radii, Shadows, Spacing } from '@/constants/theme';
import { isTrackDownloadable } from '@/services/sources/sourceRegistry';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme } from '@/store/useSettingsStore';
import { buildDynamicPlayerGradient } from '@/utils/colorUtils';
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
  const theme = useAppTheme();

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const contextTitle = usePlayerStore((s) => s.contextTitle);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const sleepTimerMode = usePlayerStore((s) => s.sleepTimerMode);

  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const cycleRepeatMode = usePlayerStore((s) => s.cycleRepeatMode);

  const tracksById = useLibraryStore((s) => s.tracksById);
  const playlists = useLibraryStore((s) => s.playlists);
  const likedTrackIds = useLibraryStore((s) => s.likedTrackIds);

  const [savedInOpen, setSavedInOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [infoExpanded, setInfoExpanded] = useState(false);

  const currentArtist = currentTrack?.artist;
  const artistTracksCount = useMemo(() => {
    if (!currentArtist) return 0;
    const target = currentArtist.toLowerCase();
    return Object.values(tracksById).filter(
      (t) => t.artist.toLowerCase() === target
    ).length;
  }, [tracksById, currentArtist]);

  if (!currentTrack) {
    return (
      <View style={[styles.emptyRoot, { backgroundColor: theme.background, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-down" size={28} color={theme.text} />
        </Pressable>
        <Text style={[styles.emptyText, { color: theme.text }]}>Nothing playing right now.</Text>
      </View>
    );
  }

  const isLiked = likedTrackIds.includes(currentTrack.id);
  const inPlaylist = playlists.some((p) => p.trackIds.includes(currentTrack.id));
  const isSaved = isLiked || inPlaylist;

  const gradient = buildDynamicPlayerGradient(
    currentTrack.dominantColor,
    theme.surfaceElevated,
    theme.background
  );
  const artSize = Math.min(SCREEN_WIDTH - 48, 380);
  const canDownload = isTrackDownloadable(currentTrack);
  const timerActive = sleepTimerMode !== 'off';

  return (
    <LinearGradient
      colors={[gradient.top, gradient.mid, gradient.bottom]}
      locations={[0, 0.52, 1]}
      style={styles.root}
    >
      <ArtworkColorSampler track={currentTrack} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom: Math.max(insets.bottom, 22),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
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

        {/* Artwork */}
        <View style={[styles.artworkWrap, Shadows.artwork]}>
          <TrackArtwork
            artworkUrl={currentTrack.artworkUrl}
            localArtworkUri={currentTrack.localArtworkUri}
            artworkAsset={currentTrack.artworkAsset}
            dominantColor={currentTrack.dominantColor}
            size={artSize}
            borderRadius={8}
          />
        </View>

        {/* Track Title + Artist + Saved In (+) button */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1, paddingRight: 14 }}>
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

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setSavedInOpen(true);
            }}
            hitSlop={10}
            accessibilityLabel={isSaved ? 'Manage saved playlists' : 'Save to library or playlist'}
          >
            <Ionicons
              name={isSaved ? 'checkmark-circle' : 'add-circle-outline'}
              size={28}
              color={isSaved ? Palette.brandGreen : Palette.white}
            />
          </Pressable>
        </View>

        {/* Seek Bar */}
        <View style={styles.sliderWrap}>
          <PlayerSeekSection />
        </View>

        {/* 5 Transport Controls: Repeat | Previous | Play/Pause | Next | Sleep Timer */}
        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              cycleRepeatMode();
            }}
            hitSlop={10}
            style={styles.controlSlot}
            accessibilityLabel={`Repeat mode: ${repeatMode}`}
          >
            <Ionicons
              name="repeat"
              size={25}
              color={repeatMode !== 'off' ? Palette.brandGreen : Palette.white}
            />
            {repeatMode !== 'off' && (
              <View style={styles.activeDot}>
                {repeatMode === 'one' && <Text style={styles.repeatOne}>1</Text>}
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              previous();
            }}
            hitSlop={10}
            accessibilityLabel="Previous track"
          >
            <Ionicons name="play-skip-back" size={32} color={Palette.white} />
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
              size={30}
              color={gradient.playIconColor}
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
            <Ionicons name="play-skip-forward" size={32} color={Palette.white} />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setTimerOpen(true);
            }}
            hitSlop={10}
            style={styles.controlSlot}
            accessibilityLabel="Sleep timer"
          >
            <Ionicons
              name="timer-outline"
              size={25}
              color={timerActive ? Palette.brandGreen : Palette.white}
            />
            {timerActive && <View style={styles.activeDot} />}
          </Pressable>
        </View>

        {/* Bottom Utility Bar: Connect left | Share + Queue right */}
        <View style={styles.bottomActions}>
          <Pressable
            onPress={() => router.push('/devices')}
            hitSlop={12}
            accessibilityLabel="Connect to a device"
          >
            <Ionicons name="phone-portrait-outline" size={21} color={Palette.white} />
          </Pressable>

          <View style={styles.rightUtilityIcons}>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/share', params: { trackId: currentTrack.id } })
              }
              hitSlop={12}
              accessibilityLabel="Share track"
            >
              <Ionicons name="share-outline" size={21} color={Palette.white} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/queue')}
              hitSlop={12}
              accessibilityLabel="Open queue"
            >
              <Ionicons name="reorder-three" size={24} color={Palette.white} />
            </Pressable>
          </View>
        </View>

        {/* About the artist card (dynamic artwork & artist data) */}
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
          style={[styles.aboutCard, { backgroundColor: gradient.cardBg }]}
        >
          <View style={styles.aboutBannerWrap}>
            <TrackArtwork
              artworkUrl={currentTrack.artworkUrl}
              localArtworkUri={currentTrack.localArtworkUri}
              artworkAsset={currentTrack.artworkAsset}
              dominantColor={currentTrack.dominantColor}
              size={SCREEN_WIDTH - 48}
              borderRadius={0}
              style={styles.aboutBannerImage}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.72)']}
              style={styles.aboutBannerOverlay}
            >
              <Text style={styles.aboutCardTitle}>About the artist</Text>
            </LinearGradient>
          </View>

          <View style={styles.aboutBody}>
            <View style={styles.aboutTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.aboutArtistName} numberOfLines={1}>
                  {currentTrack.artist}
                </Text>
                <Text style={styles.aboutMeta}>
                  {artistTracksCount > 0
                    ? `${artistTracksCount} ${artistTracksCount === 1 ? 'track' : 'tracks'} in catalog · ${getSourceLabel(currentTrack.sourceId)}`
                    : getSourceLabel(currentTrack.sourceId)}
                </Text>
              </View>
              <View style={styles.viewArtistPill}>
                <Text style={styles.viewArtistText}>View</Text>
              </View>
            </View>
          </View>
        </Pressable>

        {/* Secondary expandable Credits & Lyrics card */}
        <Pressable
          onPress={() => setInfoExpanded((v) => !v)}
          style={[styles.creditsCard, { backgroundColor: gradient.cardBg }]}
        >
          <View style={styles.creditsHeader}>
            <Text style={styles.creditsTitle}>Track Info &amp; Credits</Text>
            <Ionicons
              name={infoExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="rgba(255,255,255,0.75)"
            />
          </View>
          {infoExpanded && (
            <Text style={styles.creditsBody}>
              {currentTrack.lyricsPreview ||
                `Source: ${getSourceLabel(currentTrack.sourceId)}\nLicense: ${
                  currentTrack.license || 'Audio Stream'
                }\n${
                  canDownload
                    ? 'Offline Download: Available in Track Options (···)'
                    : 'Offline Download: Streaming / Local only'
                }`}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      <AddToPlaylistModal
        visible={savedInOpen}
        track={currentTrack}
        onClose={() => setSavedInOpen(false)}
      />

      <SleepTimerSheet
        visible={timerOpen}
        onClose={() => setTimerOpen(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  emptyRoot: {
    flex: 1,
    padding: Spacing.lg,
  },
  emptyText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    marginTop: 40,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  contextWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  contextLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Palette.white,
  },
  artworkWrap: {
    alignSelf: 'center',
    marginBottom: 26,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Palette.white,
    letterSpacing: -0.4,
  },
  trackArtist: {
    fontFamily: FontFamily.medium,
    fontSize: 15.5,
    color: 'rgba(255,255,255,0.74)',
    marginTop: 3,
  },
  sliderWrap: {
    marginTop: 18,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  controlSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  playCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
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
    marginTop: 22,
  },
  rightUtilityIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  aboutCard: {
    marginTop: 22,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  aboutBannerWrap: {
    height: 144,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  aboutBannerImage: {
    width: '100%',
    height: 180,
  },
  aboutBannerOverlay: {
    ...StyleSheet.absoluteFill,
    padding: 16,
    justifyContent: 'flex-start',
  },
  aboutCardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Palette.white,
  },
  aboutBody: {
    padding: 16,
  },
  aboutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  aboutArtistName: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Palette.white,
  },
  aboutMeta: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 3,
  },
  viewArtistPill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: Radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  viewArtistText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
    color: Palette.white,
  },
  creditsCard: {
    marginTop: 12,
    borderRadius: Radii.xl,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creditsTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14.5,
    color: Palette.white,
  },
  creditsBody: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 10,
  },
});
