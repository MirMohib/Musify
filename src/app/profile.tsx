import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DockedMiniPlayerFooter } from '@/components/DockedMiniPlayerFooter';
import { pickProfileAvatarUri, ProfileAvatar } from '@/components/ProfileAvatar';
import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';
import { hexWithAlpha } from '@/utils/format';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const profile = useSettingsStore((s) => s.profile);
  const updateProfile = useSettingsStore((s) => s.updateProfile);
  const playlists = useLibraryStore((s) => s.playlists);
  const likedTrackIds = useLibraryStore((s) => s.likedTrackIds);
  const recentlyPlayedIds = useLibraryStore((s) => s.recentlyPlayedIds);
  const tracksById = useLibraryStore((s) => s.tracksById);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);

  const handlePickPhoto = async () => {
    const uri = await pickProfileAvatarUri();
    if (uri) {
      await updateProfile({ avatarUri: uri });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[theme.surfaceElevated, theme.background]}
          style={[styles.hero, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </Pressable>
            <Pressable onPress={() => router.push('/settings')} hitSlop={10} accessibilityLabel="Open settings">
              <Ionicons name="settings-outline" size={22} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.centerBlock}>
            <ProfileAvatar
              size={116}
              onPress={handlePickPhoto}
              accessibilityLabel="Change profile photo"
            />
            <Text style={[styles.userName, { color: theme.text }]}>{profile.name}</Text>
            <View style={styles.actionPills}>
              <Pressable
                onPress={() => {
                  setDraftName(profile.name);
                  setEditing(true);
                }}
                style={[styles.editPill, { borderColor: hexWithAlpha(theme.text, 0.35) }]}
              >
                <Text style={[styles.editPillText, { color: theme.text }]}>Edit Profile</Text>
              </Pressable>
              <Pressable
                onPress={handlePickPhoto}
                style={[styles.editPill, { borderColor: hexWithAlpha(theme.text, 0.35) }]}
              >
                <Text style={[styles.editPillText, { color: theme.text }]}>Change Photo</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: theme.text }]}>{playlists.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>PLAYLISTS</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: theme.text }]}>{likedTrackIds.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>LIKED SONGS</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={[styles.statValue, { color: theme.text }]}>{recentlyPlayedIds.length}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>RECENTLY PLAYED</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Playlists</Text>
        {playlists.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No custom playlists yet. Create one in Your Library!
          </Text>
        ) : (
          playlists.slice(0, 5).map((pl) => {
            const firstTrack = pl.trackIds[0] ? tracksById[pl.trackIds[0]] : undefined;
            return (
              <Pressable
                key={pl.id}
                onPress={() => router.push(`/playlist/${encodeURIComponent(pl.id)}`)}
                style={styles.plRow}
              >
                <TrackArtwork
                  artworkUrl={pl.artworkUrl ?? firstTrack?.artworkUrl}
                  size={50}
                  borderRadius={6}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.plTitle, { color: theme.text }]}>{pl.name}</Text>
                  <Text style={[styles.plSub, { color: theme.textSecondary }]}>
                    {pl.trackIds.length} songs
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </Pressable>
            );
          })
        )}

        <Pressable
          onPress={() => router.push('/(tabs)/library')}
          style={styles.seeAllRow}
        >
          <Text style={[styles.seeAllText, { color: theme.text }]}>Go to Your Library</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </Pressable>
      </ScrollView>

      <DockedMiniPlayerFooter />

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surfaceElevated }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Profile</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Display name"
              placeholderTextColor={theme.textMuted}
              style={[styles.modalInput, { color: theme.text, backgroundColor: theme.surfaceInput }]}
            />
            {Boolean(profile.avatarUri) && (
              <Pressable
                onPress={async () => {
                  await updateProfile({ avatarUri: undefined });
                  setEditing(false);
                }}
                style={styles.removePhotoRow}
              >
                <Ionicons name="trash-outline" size={16} color={theme.textSecondary} />
                <Text style={[styles.removePhotoText, { color: theme.textSecondary }]}>
                  Remove profile photo
                </Text>
              </Pressable>
            )}
            <View style={styles.modalBtns}>
              <Pressable onPress={() => setEditing(false)}>
                <Text style={[styles.modalCancel, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (draftName.trim()) {
                    await updateProfile({ name: draftName.trim() });
                  }
                  setEditing(false);
                }}
                style={styles.modalSave}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerBlock: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  userName: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    marginTop: Spacing.md,
  },
  actionPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  editPill: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  editPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.xxl,
  },
  statCol: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
  },
  statLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  plRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
    gap: 14,
  },
  plTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15.5,
  },
  plSub: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    marginTop: 2,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  seeAllText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    borderRadius: Radii.xl,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    marginBottom: Spacing.md,
  },
  modalInput: {
    height: 46,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.medium,
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 18,
    marginTop: Spacing.lg,
  },
  removePhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
    paddingVertical: 4,
  },
  removePhotoText: {
    fontFamily: FontFamily.medium,
    fontSize: 13.5,
  },
  modalCancel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
  },
  modalSave: {
    backgroundColor: Palette.brandGreen,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: Radii.pill,
  },
  modalSaveText: {
    fontFamily: FontFamily.bold,
    color: '#121212',
  },
});
