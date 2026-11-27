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
import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const [storesReady, setStoresReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateLibrary = useLibraryStore((s) => s.hydrate);
  const hydrateDownloads = useDownloadStore((s) => s.hydrate);
  const initAudio = usePlayerStore((s) => s.initAudio);
  const playbackError = usePlayerStore((s) => s.playbackError);
  const clearError = usePlayerStore((s) => s.clearError);
  const onboarded = useSettingsStore((s) => s.profile.onboarded);
  const theme = useAppTheme();

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

  useEffect(() => {
    if (fontsLoaded && storesReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, storesReady]);

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

  if (!fontsLoaded || !storesReady) {
    return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
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
    </SafeAreaProvider>
  );
}