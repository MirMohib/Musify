import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Palette, Shadows, Spacing } from '@/constants/theme';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme } from '@/store/useSettingsStore';
import { buildDynamicPlayerGradient } from '@/utils/colorUtils';

export default function ShareScreen() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const tracksById = useLibraryStore((s) => s.tracksById);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const track = (trackId ? tracksById[trackId] : undefined) ?? currentTrack;

  if (!track) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 14, paddingHorizontal: Spacing.xl }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={26} color={Palette.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Share</Text>
          <View style={{ width: 26 }} />
        </View>
        <Text style={[styles.trackArtist, { textAlign: 'center', marginTop: 40 }]}>
          Select a track to share.
        </Text>
      </View>
    );
  }

  const shareMessage = `Listen to "${track.title}" by ${track.artist} on Musify! ${
    track.streamUrl ?? ''
  }`.trim();

  const triggerSystemShare = async () => {
    try {
      await Share.share({ message: shareMessage, title: track.title });
    } catch {
      // ignore cancelled share
    }
  };

  const targets: {
    label: string;
    bg: string;
    icon: React.ReactNode;
    onPress: () => void;
  }[] = [
    {
      label: 'Copy Link',
      bg: '#282828',
      icon: <Ionicons name="link" size={22} color={Palette.white} />,
      onPress: () => Alert.alert('Link Ready', shareMessage),
    },
    {
      label: 'WhatsApp',
      bg: '#25D366',
      icon: <FontAwesome name="whatsapp" size={24} color={Palette.white} />,
      onPress: triggerSystemShare,
    },
    {
      label: 'Twitter',
      bg: '#1DA1F2',
      icon: <FontAwesome name="twitter" size={22} color={Palette.white} />,
      onPress: triggerSystemShare,
    },
    {
      label: 'Messages',
      bg: '#34C759',
      icon: <Ionicons name="chatbubble" size={22} color={Palette.white} />,
      onPress: triggerSystemShare,
    },
    {
      label: 'More',
      bg: '#3A3A3C',
      icon: <Ionicons name="ellipsis-horizontal" size={22} color={Palette.white} />,
      onPress: triggerSystemShare,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[
          buildDynamicPlayerGradient(
            track.dominantColor,
            theme.surfaceElevated,
            theme.background
          ).top,
          theme.background,
        ]}
        locations={[0, 0.72]}
        style={[styles.topArea, { paddingTop: insets.top + 14 }]}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={26} color={Palette.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Share</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={[styles.artWrap, Shadows.artwork]}>
          <TrackArtwork
            artworkUrl={track.artworkUrl}
            localArtworkUri={track.localArtworkUri}
            artworkAsset={track.artworkAsset}
            dominantColor={track.dominantColor}
            size={218}
            borderRadius={4}
          />
        </View>

        <Text style={styles.trackTitle} numberOfLines={2}>
          {track.title}
        </Text>
        <Text style={styles.trackArtist}>{track.artist}</Text>
      </LinearGradient>

      <View style={[styles.targetsWrap, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.targetsGrid}>
          {targets.map((t) => (
            <Pressable key={t.label} onPress={t.onPress} style={styles.targetItem}>
              <View style={[styles.circle, { backgroundColor: t.bg }]}>{t.icon}</View>
              <Text style={styles.targetLabel}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topArea: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 42,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Palette.white,
  },
  artWrap: {
    marginBottom: 24,
  },
  trackTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Palette.white,
    textAlign: 'center',
  },
  trackArtist: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Palette.mutedText,
    marginTop: 6,
  },
  targetsWrap: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  targetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 22,
  },
  targetItem: {
    width: '20%',
    alignItems: 'center',
    gap: 8,
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Palette.white,
    textAlign: 'center',
  },
});
