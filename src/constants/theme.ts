/**
 * Design tokens extracted from the Musify Figma Design System:
 * - Colour Palette (node 91:2643)
 * - Typography (node 168:2082)
 * - Home (1:346), Track View (12:1946), Search (42:1795), Library (107:3451)
 */

import { Platform } from 'react-native';
import type { ThemeMode } from '@/types/music';

export const Palette = {
  brandGreen: '#1ED760',
  brandGreenActive: '#1DB954',
  brandGreenMuted: '#17B54E',

  white: '#FFFFFF',
  offWhite: '#F5F5F5',
  lightText: '#E5E5E5',
  mutedText: '#B3B3B3',
  neutral01: '#B2B2B2',
  neutral02: '#777777',
  subtleText: '#9C9C9C',

  bgDarkest: '#121212',
  bgHome: '#111111',
  bgPureBlack: '#000000',
  surfaceElevated: '#282828',
  surfaceCard: '#1F1F21',
  surfaceChip: '#2A2A2A',
  divider: '#2E2E2E',

  // Full-player gradient defaults (from Track View 12:2029)
  playerGradientTop: '#962419',
  playerGradientMid: '#661710',
  playerGradientBottom: '#430E09',

  // MiniPlayer tint (from Home 1:365 & Search 41:1572)
  miniPlayerRedTint: '#542129',
  miniPlayerSlateTint: '#252B36',

  // Lyrics card (from Track View 13:1303 / 13:1304)
  lyricsCardOrange: '#D8672A',
  lyricsPillBrown: '#6B3311',

  // Search Genre Cards (from Search 42:1795)
  genrePop: '#9854B2',
  genreIndie: '#678026',
  genreNews: '#3371E4',
  genreComedy: '#CF4321',
  genreWrapped: '#ABBB6D',
  genrePodcasts: '#223160',
  genreMadeForYou: '#75A768',
  genreCharts: '#8768A7',

  // Liked Songs gradient (Library 107:3516)
  likedGradientStart: '#450AF5',
  likedGradientEnd: '#C4EFD9',

  // New Episodes icon box (Library 107:3523)
  episodesBg: '#27856B',

  danger: '#E91429',
  warning: '#FFA42B',
} as const;

export interface ThemeColors {
  background: string;
  backgroundHome: string;
  surface: string;
  surfaceElevated: string;
  surfaceInput: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  accent: string;
  accentActive: string;
  tabBarBg: string;
  tabActive: string;
  tabInactive: string;
  miniPlayerDefault: string;
  danger: string;
  isDark: boolean;
}

export const Themes: Record<ThemeMode, ThemeColors> = {
  dark: {
    background: Palette.bgDarkest,
    backgroundHome: Palette.bgHome,
    surface: Palette.surfaceCard,
    surfaceElevated: Palette.surfaceElevated,
    surfaceInput: '#333333',
    text: Palette.white,
    textSecondary: Palette.mutedText,
    textMuted: Palette.neutral02,
    border: 'rgba(255,255,255,0.12)',
    accent: Palette.brandGreen,
    accentActive: Palette.brandGreenActive,
    tabBarBg: 'rgba(18,18,18,0.96)',
    tabActive: Palette.white,
    tabInactive: Palette.mutedText,
    miniPlayerDefault: '#2B2B2B',
    danger: Palette.danger,
    isDark: true,
  },
  amoled: {
    background: Palette.bgPureBlack,
    backgroundHome: Palette.bgPureBlack,
    surface: '#141414',
    surfaceElevated: '#1E1E1E',
    surfaceInput: '#242424',
    text: Palette.white,
    textSecondary: Palette.mutedText,
    textMuted: Palette.neutral02,
    border: 'rgba(255,255,255,0.1)',
    accent: Palette.brandGreen,
    accentActive: Palette.brandGreenActive,
    tabBarBg: 'rgba(0,0,0,0.98)',
    tabActive: Palette.white,
    tabInactive: Palette.mutedText,
    miniPlayerDefault: '#1A1A1A',
    danger: Palette.danger,
    isDark: true,
  },
  light: {
    background: '#F7F7F7',
    backgroundHome: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceElevated: '#EAEAEA',
    surfaceInput: '#E5E5E5',
    text: '#121212',
    textSecondary: '#555555',
    textMuted: '#777777',
    border: 'rgba(0,0,0,0.1)',
    accent: Palette.brandGreenActive,
    accentActive: '#15883E',
    tabBarBg: 'rgba(255,255,255,0.97)',
    tabActive: '#121212',
    tabInactive: '#777777',
    miniPlayerDefault: '#282828',
    danger: Palette.danger,
    isDark: false,
  },
};

/**
 * Typography tokens mapped to Plus Jakarta Sans (cross-platform Avenir Next match).
 * Falls back cleanly if fonts are still loading.
 */
export const FontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  systemFallback: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'sans-serif' }),
} as const;

export const Typography = {
  heroTitle: { fontFamily: FontFamily.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  screenTitle: { fontFamily: FontFamily.bold, fontSize: 25, lineHeight: 30, letterSpacing: -0.4 },
  sectionTitle: { fontFamily: FontFamily.semiBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
  subsectionTitle: { fontFamily: FontFamily.bold, fontSize: 19, lineHeight: 25, letterSpacing: -0.3 },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: 16, lineHeight: 21 },
  bodyBold: { fontFamily: FontFamily.bold, fontSize: 16, lineHeight: 22 },
  bodySemiBold: { fontFamily: FontFamily.semiBold, fontSize: 15, lineHeight: 20 },
  bodyMedium: { fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 19 },
  body: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: FontFamily.medium, fontSize: 12, lineHeight: 16 },
  small: { fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 14 },
  micro: { fontFamily: FontFamily.medium, fontSize: 10, lineHeight: 12 },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radii = {
  xs: 2,
  sm: 4,
  md: 7,
  lg: 8,
  xl: 12,
  pill: 45,
  full: 9999,
} as const;

export const Layout = {
  miniPlayerHeight: 59,
  tabBarHeight: 60,
  horizontalPadding: 16,
  figmaBaselineWidth: 428,
} as const;

export const Shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 5,
  },
  artwork: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;
