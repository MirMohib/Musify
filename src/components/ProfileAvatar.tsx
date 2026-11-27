import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily, Palette } from '@/constants/theme';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';

const AVATAR_DIR_NAME = 'profile_avatar';

function getInitials(name?: string): string {
  const clean = (name ?? '').trim();
  if (!clean) return 'M';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 1).toUpperCase();
}

/**
 * Lets the user pick a custom profile image from Files/Photos without extra native modules
 * and copies it into persistent app documents storage.
 */
export async function pickProfileAvatarUri(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['image/*'],
    multiple: false,
    copyToCacheDirectory: true,
  });

  if (res.canceled || !res.assets?.[0]) {
    return null;
  }

  const asset = res.assets[0];
  const extMatch = (asset.name || '').match(/\.(png|jpg|jpeg|webp|heic)$/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : '.jpg';

  try {
    const dir = new Directory(Paths.document, AVATAR_DIR_NAME);
    if (!dir.exists) {
      dir.create({ intermediates: true, idempotent: true });
    }
    const dest = new File(dir, `avatar_${Date.now()}${ext}`);
    const src = new File(asset.uri);
    src.copy(dest);
    return dest.exists ? dest.uri : asset.uri;
  } catch {
    return asset.uri;
  }
}

interface ProfileAvatarProps {
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export const ProfileAvatar = React.memo(function ProfileAvatar({
  size = 34,
  onPress,
  accessibilityLabel = 'Open profile menu',
}: ProfileAvatarProps) {
  const theme = useAppTheme();
  const profile = useSettingsStore((s) => s.profile);
  const initials = getInitials(profile.name);
  const fontSize = Math.max(12, Math.round(size * 0.42));

  const content = profile.avatarUri ? (
    <Image
      source={{ uri: profile.avatarUri }}
      cachePolicy="memory-disk"
      style={[
        styles.image,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.surfaceElevated,
        },
      ]}
      contentFit="cover"
    />
  ) : (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: Palette.brandGreen,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => pressed && { opacity: 0.78 }}
    >
      {content}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  image: {
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: FontFamily.bold,
    color: '#121212',
  },
});
