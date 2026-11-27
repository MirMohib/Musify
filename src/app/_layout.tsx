import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppEntranceLoader } from '@/components/AppEntranceLoader';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

const MIN_ENTRANCE_MS = 1200;
const MAX_PRELOAD_WAIT_MS = 2800;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const [storesReady, setStoresReady] = useState(false);
  const [minEntranceDone, setMinEntranceDone] = useState(false);
  const [maxWaitDone, setMaxWaitDone] = useState(false);
  const [entranceFinished, setEntranceFinished] = useState(false);

  const router = useRouter();
  const segments = useSegments();

  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateLibrary = useLibraryStore((s) => s.hydrate);
  const hydrateDownloads = useDownloadStore((s) => s.hydrate);
  const isLoadingFeed = useLibraryStore((s) => s.isLoadingFeed);
  const isScanningDevice = useLibraryStore((s) => s.isScanningDevice);
  const initAudio = usePlayerStore((s) => s.initAudio);
  const playbackError = usePlayerStore((s) => s.playbackError);
  const clearError = usePlayerStore((s) => s.clearError);
  const onboarded = useSettingsStore((s) => s.profile.onboarded);
  const theme = useAppTheme();

  useEffect(() => {
    const minTimer = setTimeout(() => setMinEntranceDone(true), MIN_ENTRANCE_MS);
    const maxTimer = setTimeout(() => setMaxWaitDone(true), MAX_PRELOAD_WAIT_MS);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function boot() {
      try {
        await hydrateSettings();
        await Promise.all([hydrateLibrary(), hydrateDownloads()]);
        initAudio();
      } finally {
        if (mounted) {
          setStoresReady(true);
        }
      }
    }
    boot();
    return () => {
      mounted = false;
    };
  }, [hydrateSettings, hydrateLibrary, hydrateDownloads, initAudio]);

  const handleLoaderLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleFinishExit = useCallback(() => {
    setEntranceFinished(true);
  }, []);

  useEffect(() => {
    if (!storesReady) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!onboarded && !inOnboarding) {
      router.replace('/onboarding/start');
    } else if (onboarded && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [storesReady, onboarded, segments, router]);

  useEffect(() => {
    if (playbackError) {
      Alert.alert('Playback Notice', playbackError, [{ text: 'OK', onPress: clearError }]);
    }
  }, [playbackError, clearError]);

  const coreReady = fontsLoaded && storesReady;
  const preloadSettled = !isLoadingFeed && !isScanningDevice;
  const isAppReady =
    coreReady && minEntranceDone && (preloadSettled || maxWaitDone);

  let statusText = 'Initializing app...';
  if (isAppReady) {
    statusText = 'Ready';
  } else if (coreReady && isScanningDevice) {
    statusText = 'Scanning local audio...';
  } else if (coreReady && isLoadingFeed) {
    statusText = 'Loading music library...';
  } else if (coreReady) {
    statusText = 'Preparing interface...';
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      {coreReady && (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.background },
          }}
        >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="album/[id]" />
        <Stack.Screen name="artist/[id]" />
        <Stack.Screen name="playlist/[id]" />
        <Stack.Screen name="downloads" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="recents" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="onboarding/start" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding/signup" />
        <Stack.Screen name="onboarding/login" />
        <Stack.Screen name="onboarding/choose-artists" />
        <Stack.Screen name="onboarding/choose-podcasts" />
        <Stack.Screen
          name="player"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="queue"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="track-options"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="album-options"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="share"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="devices"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="scanner"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        </Stack>
      )}

      {!entranceFinished && (
        <AppEntranceLoader
          isReady={isAppReady}
          statusText={statusText}
          onFirstLayout={handleLoaderLayout}
          onFinishExit={handleFinishExit}
        />
      )}
    </SafeAreaProvider>
  );
}