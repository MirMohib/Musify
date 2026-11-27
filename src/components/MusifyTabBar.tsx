import { Ionicons } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/components/MiniPlayer';
import { FontFamily, Palette, Spacing } from '@/constants/theme';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';

type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

const TAB_CONFIG: {
  routeName: string;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}[] = [
  { routeName: 'index', label: 'Home', activeIcon: 'home', inactiveIcon: 'home-outline' },
  { routeName: 'search', label: 'Search', activeIcon: 'search', inactiveIcon: 'search-outline' },
  {
    routeName: 'library',
    label: 'Your Library',
    activeIcon: 'library',
    inactiveIcon: 'library-outline',
  },
];

export function MusifyTabBar({ state, emitter, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const offlineOnly = useSettingsStore((s) => s.settings.offlineOnly);

  const currentRouteName = state.routes[state.index]?.name ?? 'index';

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.tabBarBg }]}>
      {offlineOnly && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={12} color="#121212" />
          <Text style={styles.offlineText}>Offline mode enabled · Playing downloaded & device audio</Text>
        </View>
      )}

      <MiniPlayer />

      <View
        style={[
          styles.tabRow,
          {
            paddingBottom: Math.max(insets.bottom, 8),
            borderTopColor: theme.border,
          },
        ]}
      >
        {TAB_CONFIG.map((tab) => {
          const route = state.routes.find((r) => r.name === tab.routeName);
          if (!route) return null;
          const isFocused = currentRouteName === tab.routeName;

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          return (
            <Pressable
              key={tab.routeName}
              onPress={onPress}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
            >
              <Ionicons
                name={isFocused ? tab.activeIcon : tab.inactiveIcon}
                size={23}
                color={isFocused ? theme.tabActive : theme.tabInactive}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? theme.tabActive : theme.tabInactive,
                    fontFamily: isFocused ? FontFamily.semiBold : FontFamily.regular,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.brandGreen,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
    marginBottom: 4,
  },
  offlineText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: '#121212',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
  },
});
