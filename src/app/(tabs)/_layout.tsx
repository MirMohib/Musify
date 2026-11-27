import { Tabs } from 'expo-router';
import React from 'react';

import { MusifyTabBar } from '@/components/MusifyTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <MusifyTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="library" options={{ title: 'Your Library' }} />

      {/* Detail & secondary screens kept inside (tabs) so MiniPlayer + TabBar remain docked like Figma */}
      <Tabs.Screen name="album/[id]" options={{ href: null }} />
      <Tabs.Screen name="playlist/[id]" options={{ href: null }} />
      <Tabs.Screen name="artist/[id]" options={{ href: null }} />
      <Tabs.Screen name="downloads" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
