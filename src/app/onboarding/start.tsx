import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MusifyLogo } from '@/components/MusifyLogo';
import { FigmaAssets } from '@/constants/figmaAssets';
import { FontFamily, Palette, Radii } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function StartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const handleSocialOrGuest = async (label: string) => {
    await completeOnboarding({
      name: label === 'Guest' ? 'Guest' : 'maya',
      isGuest: label === 'Guest',
    });
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <Image
            source={FigmaAssets.startHero}
            style={styles.heroImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={['rgba(18,18,18,0.05)', 'rgba(18,18,18,0.65)', Palette.bgDarkest]}
            locations={[0.15, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.logoWrap}>
            <MusifyLogo size={54} circleColor={Palette.white} waveColor={Palette.bgDarkest} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.headline}>
            Millions of Songs.{'\n'}Free on Musify.
          </Text>

          <Pressable
            onPress={() => router.push('/onboarding/signup')}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.primaryBtnText}>Sign up free</Text>
          </Pressable>

          <Pressable
            onPress={() => handleSocialOrGuest('Google')}
            style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.75 }]}
          >
            <FontAwesome name="google" size={18} color="#EA4335" style={styles.btnIcon} />
            <Text style={styles.outlineBtnText}>Continue with Google</Text>
          </Pressable>

          <Pressable
            onPress={() => handleSocialOrGuest('Facebook')}
            style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.75 }]}
          >
            <FontAwesome name="facebook-official" size={20} color="#1877F2" style={styles.btnIcon} />
            <Text style={styles.outlineBtnText}>Continue with Facebook</Text>
          </Pressable>

          <Pressable
            onPress={() => handleSocialOrGuest('Apple')}
            style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.75 }]}
          >
            <Ionicons name="logo-apple" size={20} color={Palette.white} style={styles.btnIcon} />
            <Text style={styles.outlineBtnText}>Continue with Apple</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/onboarding/login')}
            style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.loginText}>Log in</Text>
          </Pressable>

          <Pressable
            onPress={() => handleSocialOrGuest('Guest')}
            style={({ pressed }) => [styles.guestBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.guestText}>Skip &amp; continue as Guest</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.bgDarkest,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroWrap: {
    height: 410,
    width: '100%',
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  logoWrap: {
    marginBottom: 8,
    zIndex: 2,
  },
  body: {
    paddingHorizontal: 32,
    alignItems: 'center',
    paddingTop: 6,
  },
  headline: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    lineHeight: 35,
    color: Palette.white,
    textAlign: 'center',
    marginBottom: 28,
  },
  primaryBtn: {
    width: '100%',
    height: 49,
    borderRadius: Radii.pill,
    backgroundColor: Palette.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: '#000000',
  },
  outlineBtn: {
    width: '100%',
    height: 49,
    borderRadius: Radii.pill,
    backgroundColor: Palette.bgDarkest,
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  btnIcon: {
    position: 'absolute',
    left: 20,
  },
  outlineBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15.5,
    color: Palette.offWhite,
  },
  loginBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  loginText: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Palette.offWhite,
  },
  guestBtn: {
    marginTop: 2,
    paddingVertical: 6,
  },
  guestText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Palette.mutedText,
  },
});
