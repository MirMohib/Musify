import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';

import { FontFamily, Palette } from '@/constants/theme';
import { formatDuration, formatRemaining } from '@/utils/format';

interface SeekSliderProps {
  positionMs: number;
  durationMs: number;
  onSeek: (positionMs: number) => void;
}

export function SeekSlider({ positionMs, durationMs, onSeek }: SeekSliderProps) {
  const [barWidth, setBarWidth] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  const [dragMs, setDragMs] = useState(0);

  const effectiveMs = isSeeking ? dragMs : positionMs;
  const ratio = durationMs > 0 ? Math.max(0, Math.min(1, effectiveMs / durationMs)) : 0;

  const computeMs = (locationX: number) => {
    const clamped = Math.max(0, Math.min(1, locationX / Math.max(1, barWidth)));
    return Math.round(clamped * Math.max(0, durationMs));
  };

  const handleGrant = (evt: GestureResponderEvent) => {
    setIsSeeking(true);
    setDragMs(computeMs(evt.nativeEvent.locationX));
  };

  const handleMove = (evt: GestureResponderEvent) => {
    setDragMs(computeMs(evt.nativeEvent.locationX));
  };

  const handleRelease = (evt: GestureResponderEvent) => {
    const target = computeMs(evt.nativeEvent.locationX);
    setIsSeeking(false);
    onSeek(target);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  const thumbSize = isSeeking ? 16 : 13;
  const thumbLeft = Math.max(0, Math.min(barWidth - thumbSize, ratio * barWidth - thumbSize / 2));

  return (
    <View style={styles.container}>
      <View
        style={styles.touchArea}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleGrant}
        onResponderMove={handleMove}
        onResponderRelease={handleRelease}
        onResponderTerminate={() => setIsSeeking(false)}
      >
        <View style={styles.trackBg}>
          <View style={[styles.trackFill, { width: `${ratio * 100}%` }]} />
        </View>
        <View
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              left: thumbLeft,
              top: (28 - thumbSize) / 2,
            },
          ]}
        />
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatDuration(effectiveMs)}</Text>
        <Text style={styles.timeText}>
          {durationMs > 0 ? formatRemaining(effectiveMs, durationMs) : '-0:00'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  touchArea: {
    height: 28,
    justifyContent: 'center',
  },
  trackBg: {
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: Palette.white,
    borderRadius: 4,
  },
  thumb: {
    position: 'absolute',
    backgroundColor: Palette.white,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Palette.neutral01,
  },
});
