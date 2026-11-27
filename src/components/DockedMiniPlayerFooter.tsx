import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/components/MiniPlayer';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme } from '@/store/useSettingsStore';

/**
 * Docks the persistent MiniPlayer at the bottom of root Stack screens
 * (Album, Artist, Playlist, Downloads, Profile, Settings).
 */
export function DockedMiniPlayerFooter() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  if (!currentTrack) return null;

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: theme.tabBarBg,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingTop: 6,
  },
});
