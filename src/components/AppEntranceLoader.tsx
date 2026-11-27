import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Palette, Radii, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/store/useSettingsStore';
import { hexWithAlpha } from '@/utils/format';

const SPLASH_LOGO = require('../../assets/images/splash-icon.png');
const LOGO_SIZE = 96;
const BAR_TRACK_WIDTH = 128;
const BAR_THUMB_WIDTH = 44;

interface AppEntranceLoaderProps {
  isReady: boolean;
  statusText?: string;
  onFirstLayout?: () => void;
  onFinishExit?: () => void;
}

export function AppEntranceLoader({
  isReady,
  statusText = 'Loading your music...',
  onFirstLayout,
  onFinishExit,
}: AppEntranceLoaderProps) {
  const theme = useAppTheme();

  const [overlayOpacity] = useState(() => new Animated.Value(1));
  const [logoScale] = useState(() => new Animated.Value(1));
  const [ripple1] = useState(() => new Animated.Value(0));
  const [ripple2] = useState(() => new Animated.Value(0));
  const [wordmarkOpacity] = useState(() => new Animated.Value(0));
  const [barProgress] = useState(() => new Animated.Value(0));

  const hasLaidOutRef = useRef(false);
  const hasExitedRef = useRef(false);
  const breathLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Animated.timing(wordmarkOpacity, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    const breath = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.07,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1.0,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    breathLoopRef.current = breath;
    breath.start();

    const pulse1 = Animated.loop(
      Animated.timing(ripple1, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );

    const pulse2 = Animated.loop(
      Animated.sequence([
        Animated.delay(750),
        Animated.timing(ripple2, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    const barLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(barProgress, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(barProgress, {
          toValue: 0,
          duration: 950,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse1.start();
    pulse2.start();
    barLoop.start();

    return () => {
      breath.stop();
      pulse1.stop();
      pulse2.stop();
      barLoop.stop();
    };
  }, [barProgress, logoScale, ripple1, ripple2, wordmarkOpacity]);

  useEffect(() => {
    if (!isReady || hasExitedRef.current) return;
    hasExitedRef.current = true;

    let active = true;
    breathLoopRef.current?.stop();

    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1.16,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (active) {
        onFinishExit?.();
      }
    });

    return () => {
      active = false;
    };
  }, [isReady, logoScale, onFinishExit, overlayOpacity]);

  const accentColor = theme.accent || Palette.brandGreen;

  const ripple1Scale = ripple1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.85],
  });
  const ripple1Opacity = ripple1.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 0.45, 0],
  });

  const ripple2Scale = ripple2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.85],
  });
  const ripple2Opacity = ripple2.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 0.35, 0],
  });

  const barTranslateX = barProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BAR_TRACK_WIDTH - BAR_THUMB_WIDTH],
  });

  return (
    <Animated.View
      pointerEvents={isReady ? 'none' : 'auto'}
      onLayout={() => {
        if (!hasLaidOutRef.current) {
          hasLaidOutRef.current = true;
          onFirstLayout?.();
        }
      }}
      accessibilityLabel="Loading Musify"
      style={[
        styles.overlay,
        {
          backgroundColor: theme.background,
          opacity: overlayOpacity,
        },
      ]}
    >
      <View style={styles.centerStage}>
        <Animated.View
          style={[
            styles.rippleRing,
            {
              borderColor: hexWithAlpha(accentColor, 0.55),
              transform: [{ scale: ripple1Scale }],
              opacity: ripple1Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.rippleRing,
            {
              borderColor: hexWithAlpha(accentColor, 0.4),
              transform: [{ scale: ripple2Scale }],
              opacity: ripple2Opacity,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.logoContainer,
            {
              shadowColor: accentColor,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={SPLASH_LOGO}
            style={styles.logoImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </Animated.View>
      </View>

      <Animated.View style={[styles.footerStage, { opacity: wordmarkOpacity }]}>
        <Text style={[styles.brandTitle, { color: theme.text }]}>Musify</Text>
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: hexWithAlpha(theme.text, 0.12) },
          ]}
        >
          <Animated.View
            style={[
              styles.progressThumb,
              {
                backgroundColor: accentColor,
                transform: [{ translateX: barTranslateX }],
              },
            ]}
          />
        </View>
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>
          {statusText}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerStage: {
    width: LOGO_SIZE * 2,
    height: LOGO_SIZE * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleRing: {
    position: 'absolute',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 2,
  },
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  logoImage: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  footerStage: {
    position: 'absolute',
    bottom: 64,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  progressTrack: {
    width: BAR_TRACK_WIDTH,
    height: 3.5,
    borderRadius: Radii.pill,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressThumb: {
    width: BAR_THUMB_WIDTH,
    height: 3.5,
    borderRadius: Radii.pill,
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
  },
});
