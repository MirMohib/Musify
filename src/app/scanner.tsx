import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MusifyLogo } from '@/components/MusifyLogo';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';

export default function ScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={Palette.white} />
        </Pressable>
      </View>

      <View style={styles.center}>
        <View style={styles.viewfinder}>
          <Ionicons name="scan-outline" size={88} color="rgba(255,255,255,0.55)" />
        </View>

        <View style={styles.codePreview}>
          <MusifyLogo size={32} circleColor={Palette.white} waveColor="#121212" />
          <View style={styles.bars}>
            {[14, 24, 18, 30, 16, 26, 20, 12].map((h, i) => (
              <View key={i} style={[styles.bar, { height: h }]} />
            ))}
          </View>
        </View>

        <Text style={styles.prompt}>Point your camera at a{'\n'}Musify code.</Text>

        <Pressable
          onPress={() =>
            Alert.alert(
              'Musify Code Scanner',
              'Live camera QR/code scanning requires a camera permission plugin in an EAS development build. You can search directly in the Search tab!'
            )
          }
          style={styles.photoBtn}
        >
          <Text style={styles.photoBtnText}>Select from photos</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  header: {
    paddingHorizontal: Spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  viewfinder: {
    width: 240,
    height: 300,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 28,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    width: 3.5,
    borderRadius: 2,
    backgroundColor: Palette.white,
  },
  prompt: {
    fontFamily: FontFamily.bold,
    fontSize: 21,
    lineHeight: 28,
    color: Palette.white,
    textAlign: 'center',
    marginTop: 20,
  },
  photoBtn: {
    marginTop: 36,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  photoBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Palette.white,
  },
});
