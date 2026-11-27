import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/store/useSettingsStore';

function PulseBox({
  width,
  height,
  borderRadius = Radii.sm,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const theme = useAppTheme();
  const [opacity] = useState(() => new Animated.Value(0.35));

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.72,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.surfaceElevated,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SongListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.songRow}>
          <PulseBox width={48} height={48} borderRadius={4} />
          <View style={styles.songMeta}>
            <PulseBox width="68%" height={15} />
            <PulseBox width="44%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function HomeFeedSkeleton() {
  return (
    <View style={styles.homeWrap}>
      <PulseBox width={150} height={20} style={styles.headingPad} />
      <View style={styles.circleRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.circleItem}>
            <PulseBox width={104} height={104} borderRadius={52} />
            <PulseBox width={80} height={12} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
      <PulseBox width={180} height={20} style={styles.headingPad} />
      <SongListSkeleton count={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.lg,
    gap: 14,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  songMeta: {
    flex: 1,
    gap: 8,
  },
  homeWrap: {
    marginTop: Spacing.xl,
  },
  headingPad: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  circleRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 14,
    marginBottom: Spacing.xl,
  },
  circleItem: {
    alignItems: 'center',
  },
});
