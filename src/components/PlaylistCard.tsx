import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/store/useSettingsStore';

interface PlaylistCardProps {
  title: string;
  subtitle?: string;
  artworkUrl?: string;
  artworkAsset?: number;
  dominantColor?: string;
  size?: number;
  circular?: boolean;
  onPress: () => void;
}

export const PlaylistCard = React.memo(function PlaylistCard({
  title,
  subtitle,
  artworkUrl,
  artworkAsset,
  dominantColor,
  size = 148,
  circular = false,
  onPress,
}: PlaylistCardProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { width: size },
        pressed && { opacity: 0.78 },
      ]}
    >
      <TrackArtwork
        artworkUrl={artworkUrl}
        artworkAsset={artworkAsset}
        dominantColor={dominantColor}
        size={size}
        borderRadius={circular ? size / 2 : 2}
        circular={circular}
      />
      <View style={[styles.textWrap, circular && styles.centerText]}>
        <Text
          numberOfLines={subtitle ? 1 : 2}
          style={[
            styles.title,
            { color: theme.text },
            circular && { textAlign: 'center' },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={2}
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    marginRight: Spacing.md,
  },
  textWrap: {
    marginTop: Spacing.sm,
    gap: 2,
  },
  centerText: {
    alignItems: 'center',
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    lineHeight: 17,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    lineHeight: 16,
  },
});
