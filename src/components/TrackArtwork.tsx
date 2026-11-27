import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Palette } from '@/constants/theme';
import type { Track } from '@/types/music';

interface TrackArtworkProps {
  artworkUrl?: string;
  artworkAsset?: number;
  dominantColor?: string;
  size: number;
  borderRadius?: number;
  circular?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

export function TrackArtwork({
  artworkUrl,
  artworkAsset,
  dominantColor,
  size,
  borderRadius = 4,
  circular = false,
  iconName = 'musical-notes',
  style,
}: TrackArtworkProps) {
  const radius = circular ? size / 2 : borderRadius;
  const source = artworkUrl ? { uri: artworkUrl } : artworkAsset;

  if (source) {
    return (
      <Image
        source={source}
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: Palette.surfaceCard,
          },
          style as never,
        ]}
        contentFit="cover"
        transition={180}
      />
    );
  }

  return (
    <LinearGradient
      colors={[dominantColor || '#2E3A59', '#181818']}
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
        style,
      ]}
    >
      <Ionicons name={iconName} size={Math.max(16, Math.round(size * 0.42))} color="#FFFFFF" />
    </LinearGradient>
  );
}

export function getTrackArtworkProps(track?: Partial<Track> | null) {
  return {
    artworkUrl: track?.artworkUrl,
    artworkAsset: track?.artworkAsset,
    dominantColor: track?.dominantColor,
  };
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
