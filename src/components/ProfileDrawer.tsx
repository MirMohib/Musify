import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileAvatar } from '@/components/ProfileAvatar';
import { FontFamily, Palette, Spacing } from '@/constants/theme';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.84, 340);

export function ProfileDrawer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const visible = useSettingsStore((s) => s.isProfileDrawerOpen);
  const closeDrawer = useSettingsStore((s) => s.closeProfileDrawer);
  const profile = useSettingsStore((s) => s.profile);
  const rescanDeviceMusic = useLibraryStore((s) => s.rescanDeviceMusic);
  const isScanningDevice = useLibraryStore((s) => s.isScanningDevice);

  const [slideAnim] = useState(() => new Animated.Value(-DRAWER_WIDTH));

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(-DRAWER_WIDTH);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const navigateAndClose = (path: string) => {
    closeDrawer();
    router.push(path as never);
  };

  const handleScanDevice = async () => {
    closeDrawer();
    const res = await rescanDeviceMusic(true);
    Alert.alert(
      'Device Scan',
      res.message || `Indexed ${res.count} local audio file(s).`
    );
  };

  const drawerBg = theme.isDark ? '#1A1A1A' : theme.surface;

  const menuItems: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    subtitle?: string;
    onPress: () => void;
  }[] = [
    {
      icon: 'trending-up-outline',
      label: 'Listening stats',
      onPress: () => navigateAndClose('/stats'),
    },
    {
      icon: 'time-outline',
      label: 'Recents',
      onPress: () => navigateAndClose('/recents'),
    },
    {
      icon: 'arrow-down-circle-outline',
      label: 'Downloads & Offline',
      onPress: () => navigateAndClose('/downloads'),
    },
    {
      icon: 'phone-portrait-outline',
      label: isScanningDevice ? 'Scanning device...' : 'Scan device music',
      onPress: handleScanDevice,
    },
    {
      icon: 'settings-outline',
      label: 'Settings and privacy',
      onPress: () => navigateAndClose('/settings'),
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={closeDrawer}
    >
      <View style={styles.root}>
        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              backgroundColor: drawerBg,
              paddingTop: insets.top + 16,
              paddingBottom: Math.max(insets.bottom, 20),
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Profile header */}
          <Pressable
            onPress={() => navigateAndClose('/profile')}
            style={({ pressed }) => [styles.profileHeader, pressed && { opacity: 0.78 }]}
          >
            <ProfileAvatar size={48} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: theme.text }]} numberOfLines={1}>
                {profile.name}
              </Text>
              <Text style={[styles.viewProfile, { color: theme.textSecondary }]}>
                View profile
              </Text>
            </View>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuList}>
            {menuItems.map((item) => (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name={item.icon} size={23} color={theme.text} />
                <Text style={[styles.menuLabel, { color: theme.text }]}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={[styles.footerNote, { borderTopColor: theme.border }]}>
            <Text style={[styles.footerBrand, { color: Palette.brandGreen }]}>Musify</Text>
            <Text style={[styles.footerSub, { color: theme.textSecondary }]}>
              Free &amp; Offline-First Player
            </Text>
          </View>
        </Animated.View>

        <Pressable
          style={styles.backdropTap}
          onPress={closeDrawer}
          accessibilityLabel="Close profile menu"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  drawer: {
    height: '100%',
    paddingHorizontal: Spacing.xl,
  },
  backdropTap: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: Spacing.lg,
  },
  profileName: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
  },
  viewProfile: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: Spacing.md,
  },
  menuList: {
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  menuLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
  },
  footerNote: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
  },
  footerBrand: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  footerSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
});
