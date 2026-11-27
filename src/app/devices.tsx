import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';

function formatQualityLabel(quality: string): string {
  if (!quality) return 'High';
  return quality.charAt(0).toUpperCase() + quality.slice(1);
}

export default function DevicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const activeDeviceName = usePlayerStore((s) => s.activeDeviceName);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const audioQuality = useSettingsStore((s) => s.settings.audioQuality);

  const sheetBg = theme.isDark ? '#1B1B1B' : theme.surface;
  const cardBg = theme.isDark ? '#282828' : theme.surfaceElevated;

  const handleBluetoothAirplay = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Audio Output',
        'Audio output follows your browser/OS default device on Web.'
      );
      return;
    }
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert(
        'Audio Output',
        'Use Control Center (iOS) or Bluetooth settings to route audio to AirPlay or Bluetooth devices.'
      );
    }
  };

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={styles.dismissArea}
        onPress={() => router.back()}
        accessibilityLabel="Close Connect"
      />

      <View
        style={[
          styles.sheet,
          {
            backgroundColor: sheetBg,
            paddingBottom: Math.max(insets.bottom, 18),
          },
        ]}
      >
        <View
          style={[
            styles.handle,
            { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.22)' },
          ]}
        />

        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>Connect</Text>
        </View>

        <View style={styles.body}>
          {/* Active device card matching Spotify Connect */}
          <View style={[styles.deviceCard, { backgroundColor: cardBg }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={styles.deviceNameRow}>
                <Text style={[styles.deviceName, { color: theme.text }]} numberOfLines={1}>
                  {activeDeviceName}
                </Text>
                <View
                  style={[
                    styles.qualityPill,
                    { backgroundColor: theme.isDark ? '#3E3E3E' : 'rgba(0,0,0,0.1)' },
                  ]}
                >
                  <Text style={[styles.qualityText, { color: theme.textSecondary }]}>
                    {formatQualityLabel(audioQuality)}
                  </Text>
                </View>
              </View>

              <Text style={styles.nowPlayingMeta} numberOfLines={1}>
                {currentTrack
                  ? `${currentTrack.title} — ${currentTrack.artist}`
                  : 'Ready to play on this device'}
              </Text>
            </View>

            <Ionicons name="phone-portrait-outline" size={26} color={Palette.brandGreen} />
          </View>

          <Text style={[styles.emptyNetworkText, { color: theme.textSecondary }]}>
            No devices found on this network.
          </Text>
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={handleBluetoothAirplay}
            style={({ pressed }) => [
              styles.bluetoothBtn,
              { backgroundColor: cardBg },
              pressed && { opacity: 0.78 },
            ]}
          >
            <Ionicons name="bluetooth" size={18} color={theme.text} />
            <Text style={[styles.bluetoothText, { color: theme.text }]}>
              Bluetooth &amp; Airplay
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    height: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: Spacing.lg,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
  },
  body: {
    flex: 1,
  },
  deviceCard: {
    borderRadius: Radii.xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    flexShrink: 1,
  },
  qualityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualityText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },
  nowPlayingMeta: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: Palette.brandGreen,
    marginTop: 6,
  },
  emptyNetworkText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
  },
  footer: {
    paddingTop: Spacing.md,
  },
  bluetoothBtn: {
    borderRadius: Radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bluetoothText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
  },
});
