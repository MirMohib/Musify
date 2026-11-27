import { Tabs } from 'expo-router';
import React from 'react';

import { MusifyTabBar } from '@/components/MusifyTabBar';
import { ProfileDrawer } from '@/components/ProfileDrawer';

export default function TabsLayout() {
  return (
    <>
      <Tabs
        tabBar={(props) => <MusifyTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="search" options={{ title: 'Search' }} />
        <Tabs.Screen name="library" options={{ title: 'Your Library' }} />
      </Tabs>
      <ProfileDrawer />
    </>
  );
}
