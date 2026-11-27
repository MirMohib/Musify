import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrackArtwork } from '@/components/TrackArtwork';
import { FigmaAssets } from '@/constants/figmaAssets';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { usePlayerStore } from '@/store/usePlayerStore';

const OUTPUT_DEVICES = [
  { id: 'phone', name: 'This Phone', sub: 'Built-in Audio', icon: 'phone-portrait-outline' as const },
  { id: 'bravia', name: 'BRAVIA 4K GB', sub: 'Google Cast', icon: 'tv-outline' as const },
  { id: 'mac', name: 'Studio MacBook Pro', sub: 'Musify Connect', icon: 'laptop-outline' as const },
  { id: 'beatspill', name: 'BeatsPill+', sub: 'Bluetooth', icon: 'bluetooth' as const },
  { id: 'airplay', name: 'AirPlay or Bluetooth', sub: 'System Output', icon: 'radio-outline' as const },
];

export default function DevicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeDeviceName = usePlayerStore((s) => s.activeDeviceName);
  const setActiveDevice = usePlayerStore((s) => s.setActiveDevice);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.handle} />

      <View style={styles.headerRow}>
        <View style={styles.eqWrap}>
          <View style={[styles.eqBar, { height: 14 }]} />
          <View style={[styles.eqBar, { height: 18 }]} />
          <View style={[styles.eqBar, { height: 11 }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Listening on</Text>
          <View style={styles.activeSubRow}>
            <Ionicons name="bluetooth" size={13} color={Palette.brandGreen} />
            <Text style={styles.activeSubText}>{activeDeviceName}</Text>
          </View>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={24} color={Palette.white} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Select a device</Text>

        {OUTPUT_DEVICES.map((dev) => {
          const selected = activeDeviceName === dev.name;
          return (
            <Pressable
              key={dev.id}
              onPress={() => {
                setActiveDevice(dev.name);
                router.back();
              }}
              style={styles.deviceRow}
            >
              <Ionicons
                name={dev.icon}
                size={26}
                color={selected ? Palette.brandGreen : Palette.white}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.devName,
                    selected && { color: Palette.brandGreen },
                  ]}
                >
                  {dev.name}
                </Text>
                <Text style={styles.devSub}>{dev.sub}</Text>
              </View>
              {selected && (
                <Ionicons name="checkmark" size={20} color={Palette.brandGreen} />
              )}
            </Pressable>
          );
        })}

        {/* Group Session Card matching Figma 39:1545..1554 */}
        <View style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupTitle}>Start a Group Session</Text>
            <View style={styles.betaBadge}>
              <Text style={styles.betaText}>BETA</Text>
            </View>
          </View>

          <Text style={styles.groupDesc}>
            Listen with friends, in real time. Pick what to play and control the music together.
          </Text>

          <View style={styles.groupCenter}>
            <TrackArtwork artworkAsset={FigmaAssets.editors1} size={58} circular />
            <Pressable
              onPress={() =>
                Alert.alert('Group Session', 'Share your session link with friends to listen together.')
              }
              style={styles.startBtn}
            >
              <Text style={styles.startBtnText}>Start Session</Text>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/scanner')}
              style={styles.scanBtn}
            >
              <Text style={styles.scanBtnText}>Scan to join</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#191919',
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555555',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: 14,
  },
  eqWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  eqBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: Palette.brandGreen,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Palette.white,
  },
  activeSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  activeSubText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Palette.brandGreen,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Palette.white,
    marginBottom: Spacing.md,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  devName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: Palette.white,
  },
  devSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: Palette.mutedText,
    marginTop: 2,
  },
  groupCard: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Palette.white,
  },
  betaBadge: {
    backgroundColor: '#3E3E3E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  betaText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Palette.white,
  },
  groupDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Palette.mutedText,
    marginTop: 8,
  },
  groupCenter: {
    alignItems: 'center',
    marginTop: 22,
    gap: 14,
  },
  startBtn: {
    backgroundColor: Palette.brandGreen,
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: Radii.pill,
  },
  startBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#121212',
  },
  scanBtn: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  scanBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Palette.white,
  },
});
