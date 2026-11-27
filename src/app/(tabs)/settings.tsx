import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrackArtwork } from '@/components/TrackArtwork';
import { FigmaAssets } from '@/constants/figmaAssets';
import { FontFamily, Palette, Spacing } from '@/constants/theme';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';
import type { AudioQuality, ThemeMode } from '@/types/music';
import { formatBytes } from '@/utils/format';

const QUALITIES: AudioQuality[] = ['low', 'normal', 'high', 'lossless'];
const THEMES: { id: ThemeMode; label: string }[] = [
  { id: 'dark', label: 'Dark (Figma)' },
  { id: 'amoled', label: 'AMOLED Black' },
  { id: 'light', label: 'Light' },
];
const STORAGE_LIMITS_MB = [512, 1024, 2048, 5120];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const settings = useSettingsStore((s) => s.settings);
  const profile = useSettingsStore((s) => s.profile);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const resetToOnboarding = useSettingsStore((s) => s.resetToOnboarding);
  const totalBytesUsed = useDownloadStore((s) => s.totalBytesUsed);

  const cycleQuality = (kind: 'audioQuality' | 'downloadQuality') => {
    const current = settings[kind];
    const next = QUALITIES[(QUALITIES.indexOf(current) + 1) % QUALITIES.length];
    updateSettings({ [kind]: next });
  };

  const cycleTheme = () => {
    const idx = THEMES.findIndex((t) => t.id === settings.themeMode);
    const next = THEMES[(idx + 1) % THEMES.length];
    updateSettings({ themeMode: next.id });
  };

  const cycleStorageLimit = () => {
    const idx = STORAGE_LIMITS_MB.indexOf(settings.maxDownloadStorageMb);
    const next = STORAGE_LIMITS_MB[(idx + 1) % STORAGE_LIMITS_MB.length];
    updateSettings({ maxDownloadStorageMb: next });
  };

  const currentThemeLabel =
    THEMES.find((t) => t.id === settings.themeMode)?.label ?? 'Dark';

  const rows: {
    label: string;
    value?: string;
    onPress: () => void;
    toggle?: boolean;
    toggleValue?: boolean;
    onToggle?: (v: boolean) => void;
  }[] = [
    {
      label: 'Offline only',
      value: 'Play downloaded & device music only',
      toggle: true,
      toggleValue: settings.offlineOnly,
      onToggle: (v) => updateSettings({ offlineOnly: v }),
      onPress: () => updateSettings({ offlineOnly: !settings.offlineOnly }),
    },
    {
      label: 'Theme',
      value: currentThemeLabel,
      onPress: cycleTheme,
    },
    {
      label: 'Audio Quality',
      value: `Streaming: ${settings.audioQuality.toUpperCase()}`,
      onPress: () => cycleQuality('audioQuality'),
    },
    {
      label: 'Download Quality',
      value: settings.downloadQuality.toUpperCase(),
      onPress: () => cycleQuality('downloadQuality'),
    },
    {
      label: 'Storage & Downloads',
      value: `${formatBytes(totalBytesUsed)} used · Limit ${settings.maxDownloadStorageMb} MB`,
      onPress: () => router.push('/(tabs)/downloads'),
    },
    {
      label: 'Download Location',
      value: settings.downloadLocation === 'documents' ? 'App Documents' : 'App Cache',
      onPress: () =>
        updateSettings({
          downloadLocation:
            settings.downloadLocation === 'documents' ? 'cache' : 'documents',
        }),
    },
    {
      label: 'Max Download Storage Limit',
      value: `${settings.maxDownloadStorageMb} MB (tap to change)`,
      onPress: cycleStorageLimit,
    },
    {
      label: 'Data Saver',
      toggle: true,
      toggleValue: settings.dataSaver,
      onToggle: (v) => updateSettings({ dataSaver: v }),
      onPress: () => updateSettings({ dataSaver: !settings.dataSaver }),
    },
    {
      label: 'Explicit Content',
      toggle: true,
      toggleValue: settings.explicitContent,
      onToggle: (v) => updateSettings({ explicitContent: v }),
      onPress: () => updateSettings({ explicitContent: !settings.explicitContent }),
    },
    {
      label: 'Devices',
      value: 'Output & Group Session',
      onPress: () => router.push('/devices'),
    },
    {
      label: 'Playback Queue',
      onPress: () => router.push('/queue'),
    },
    {
      label: 'Account',
      value: profile.isGuest ? 'Guest session' : profile.email,
      onPress: () =>
        Alert.alert('Account', `Signed in as ${profile.name}`, [
          {
            text: 'Replay Onboarding',
            onPress: async () => {
              await resetToOnboarding();
              router.replace('/onboarding/start');
            },
          },
          { text: 'OK' },
        ]),
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Top Bar matching Figma Settings 21:1533 */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + 8,
            backgroundColor: theme.surfaceElevated,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* Profile Header matching Figma 21:1529..1531 */}
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          style={styles.profileRow}
        >
          <TrackArtwork artworkAsset={FigmaAssets.editors1} size={58} circular />
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: theme.text }]}>{profile.name}</Text>
            <Text style={[styles.profileSub, { color: theme.textSecondary }]}>
              View Profile
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </Pressable>

        {rows.map((row) => (
          <Pressable
            key={row.label}
            onPress={row.onPress}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>{row.label}</Text>
              {row.value && (
                <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
                  {row.value}
                </Text>
              )}
            </View>

            {row.toggle ? (
              <Switch
                value={Boolean(row.toggleValue)}
                onValueChange={row.onToggle}
                trackColor={{ false: '#555', true: Palette.brandGreen }}
                thumbColor={Palette.white}
              />
            ) : (
              <Ionicons name="chevron-forward" size={19} color={theme.textSecondary} />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
  },
  list: {
    paddingBottom: 32,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    gap: 14,
  },
  profileName: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
  },
  profileSub: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
  },
  rowLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 15.5,
  },
  rowValue: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    marginTop: 2,
  },
});
