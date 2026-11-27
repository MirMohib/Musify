import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';

const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const updateProfile = useSettingsStore((s) => s.updateProfile);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('');
  const [name, setName] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [shareDataOptIn, setShareDataOptIn] = useState(false);

  const isStepValid =
    (step === 1 && email.includes('@') && email.includes('.')) ||
    (step === 2 && password.length >= 8) ||
    (step === 3 && gender.trim().length > 0) ||
    (step === 4 && name.trim().length > 0);

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
    } else {
      router.back();
    }
  };

  const handleNext = async () => {
    if (!isStepValid) return;
    if (step < 4) {
      setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
      return;
    }
    await updateProfile({
      email: email.trim(),
      gender: gender.trim(),
      name: name.trim(),
      isGuest: false,
    });
    router.push('/onboarding/choose-artists');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header matching Figma SIgnup-1..4 */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backCircle} hitSlop={10}>
          <Ionicons name="chevron-back" size={18} color={Palette.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Create account</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <>
            <Text style={styles.prompt}>What’s your email?</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              placeholderTextColor="rgba(255,255,255,0.45)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
              style={styles.input}
            />
            <Text style={styles.helper}>You’ll need to confirm this email later.</Text>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.prompt}>Create a password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.45)"
              secureTextEntry
              autoFocus
              style={styles.input}
            />
            <Text style={styles.helper}>Use at least 8 characters.</Text>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.prompt}>What’s your gender?</Text>
            <TextInput
              value={gender}
              onChangeText={setGender}
              placeholder="Enter or pick below"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.input}
            />
            <View style={styles.genderChips}>
              {GENDERS.map((g) => {
                const selected = gender === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    style={[
                      styles.chip,
                      selected && {
                        borderColor: Palette.brandGreen,
                        backgroundColor: 'rgba(30,215,96,0.16)',
                      },
                    ]}
                  >
                    <Text style={styles.chipText}>{g}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <Text style={styles.prompt}>What’s your name?</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your profile name"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoFocus
              style={styles.input}
            />
            <Text style={styles.helper}>This appears on your Musify profile.</Text>

            <View style={styles.divider} />

            <Text style={styles.legalText}>
              By tapping on “Create an account”, you agree to the Musify Terms of Use.
            </Text>
            <Text style={styles.legalLink}>Terms of Use</Text>
            <Text style={styles.legalText}>
              To learn more about how Musify collects, uses, shares and protects your personal data, please see the Musify Privacy Policy.
            </Text>
            <Text style={styles.legalLink}>Privacy Policy</Text>

            <Pressable
              onPress={() => setMarketingOptIn((v) => !v)}
              style={styles.checkRow}
            >
              <Text style={styles.checkLabel}>
                Please send me news and offers from Musify.
              </Text>
              <View style={[styles.radio, marketingOptIn && styles.radioActive]}>
                {marketingOptIn && <Ionicons name="checkmark" size={14} color="#121212" />}
              </View>
            </Pressable>

            <Pressable
              onPress={() => setShareDataOptIn((v) => !v)}
              style={styles.checkRow}
            >
              <Text style={styles.checkLabel}>
                Share my registration data with Musify’s content providers for marketing purposes.
              </Text>
              <View style={[styles.radio, shareDataOptIn && styles.radioActive]}>
                {shareDataOptIn && <Ionicons name="checkmark" size={14} color="#121212" />}
              </View>
            </Pressable>
          </>
        )}

        <View style={step === 4 ? styles.createWrap : styles.nextWrap}>
          <Pressable
            onPress={handleNext}
            disabled={!isStepValid}
            style={[
              step === 4 ? styles.createBtn : styles.nextBtn,
              {
                backgroundColor: isStepValid ? Palette.white : '#535353',
              },
            ]}
          >
            <Text
              style={[
                styles.nextBtnText,
                { color: isStepValid ? '#121212' : '#B3B3B3' },
              ]}
            >
              {step === 4 ? 'Create an account' : 'Next'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
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
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  prompt: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
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
  helper: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Palette.white,
    marginTop: 8,
  },
  genderChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: Spacing.lg,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: '#535353',
  },
  chipText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Palette.white,
  },
  divider: {
    height: 1,
    backgroundColor: '#3E3E3E',
    marginVertical: Spacing.xl,
  },
  legalText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: Palette.white,
    marginBottom: 8,
  },
  legalLink: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Palette.brandGreen,
    marginBottom: 14,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    gap: 14,
  },
  checkLabel: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: Palette.white,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    backgroundColor: Palette.brandGreen,
    borderColor: Palette.brandGreen,
  },
  nextWrap: {
    alignItems: 'center',
    marginTop: 42,
  },
  nextBtn: {
    width: 86,
    height: 42,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createWrap: {
    alignItems: 'center',
    marginTop: 48,
  },
  createBtn: {
    width: 186,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
});
