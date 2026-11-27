import { create } from 'zustand';

import { Themes, type ThemeColors } from '@/constants/theme';
import {
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  getKvJson,
  setKvJson,
} from '@/services/storage/database';
import type { AppSettings, UserProfile } from '@/types/music';

const SETTINGS_KEY = 'musify_settings_v1';
const PROFILE_KEY = 'musify_profile_v1';

interface SettingsState {
  settings: AppSettings;
  profile: UserProfile;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  updateProfile: (partial: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: (partial: Partial<UserProfile>) => Promise<void>;
  resetToOnboarding: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  profile: DEFAULT_PROFILE,
  isHydrated: false,

  hydrate: async () => {
    const [savedSettings, savedProfile] = await Promise.all([
      getKvJson<AppSettings>(SETTINGS_KEY),
      getKvJson<UserProfile>(PROFILE_KEY),
    ]);
    set({
      settings: savedSettings ? { ...DEFAULT_SETTINGS, ...savedSettings } : DEFAULT_SETTINGS,
      profile: savedProfile ? { ...DEFAULT_PROFILE, ...savedProfile } : DEFAULT_PROFILE,
      isHydrated: true,
    });
  },

  updateSettings: async (partial) => {
    const next = { ...get().settings, ...partial };
    set({ settings: next });
    await setKvJson(SETTINGS_KEY, next);
  },

  updateProfile: async (partial) => {
    const next = { ...get().profile, ...partial };
    set({ profile: next });
    await setKvJson(PROFILE_KEY, next);
  },

  completeOnboarding: async (partial) => {
    const next: UserProfile = {
      ...get().profile,
      ...partial,
      onboarded: true,
    };
    set({ profile: next });
    await setKvJson(PROFILE_KEY, next);
  },

  resetToOnboarding: async () => {
    const next: UserProfile = {
      ...get().profile,
      onboarded: false,
    };
    set({ profile: next });
    await setKvJson(PROFILE_KEY, next);
  },
}));

export function useAppTheme(): ThemeColors {
  const mode = useSettingsStore((s) => s.settings.themeMode);
  return Themes[mode] ?? Themes.dark;
}
