import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const canSubmit = email.trim().length > 0 && password.length >= 4;

  const handleLogin = async () => {
    if (!canSubmit) return;
    const displayName = email.includes('@') ? email.split('@')[0] : email.trim();
    await completeOnboarding({
      email: email.trim(),
      name: displayName || 'maya',
      isGuest: false,
    });
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backCircle} hitSlop={10}>
          <Ionicons name="chevron-back" size={18} color={Palette.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Log in</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>Email or username</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="maya@musify.app"
          placeholderTextColor="rgba(255,255,255,0.45)"
          autoCapitalize="none"
          keyboardType="email-address"
          autoFocus
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: Spacing.xl }]}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="rgba(255,255,255,0.45)"
          secureTextEntry
          style={styles.input}
        />

        <View style={styles.btnWrap}>
          <Pressable
            onPress={handleLogin}
            disabled={!canSubmit}
            style={[
              styles.loginBtn,
              { backgroundColor: canSubmit ? Palette.white : '#535353' },
            ]}
          >
            <Text
              style={[
                styles.loginBtnText,
                { color: canSubmit ? '#121212' : '#B3B3B3' },
              ]}
            >
              Log in
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.bgDarkest,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Palette.white,
  },
  body: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Palette.white,
    marginBottom: Spacing.sm,
  },
  input: {
    height: 51,
    borderRadius: 5,
    backgroundColor: '#535353',
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Palette.white,
  },
  btnWrap: {
    alignItems: 'center',
    marginTop: 36,
  },
  loginBtn: {
    width: 112,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
});
