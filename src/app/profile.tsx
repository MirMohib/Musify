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
import { TrackArtwork } from '@/components/TrackArtwork';
import { FigmaAssets } from '@/constants/figmaAssets';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const profile = useSettingsStore((s) => s.profile);
  const updateProfile = useSettingsStore((s) => s.updateProfile);
  const playlists = useLibraryStore((s) => s.playlists);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#3A3A3A', theme.background]}
          style={[styles.hero, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="chevron-back" size={24} color={Palette.white} />
            </Pressable>
            <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
              <Ionicons name="settings-outline" size={22} color={Palette.white} />
            </Pressable>
          </View>

          <View style={styles.centerBlock}>
            <TrackArtwork artworkAsset={FigmaAssets.editors1} size={122} circular />
            <Text style={styles.userName}>{profile.name}</Text>
            <Pressable
              onPress={() => {
                setDraftName(profile.name);
                setEditing(true);
              }}
              style={styles.editPill}
            >
              <Text style={styles.editPillText}>Edit Profile</Text>
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{playlists.length}</Text>
              <Text style={styles.statLabel}>PLAYLISTS</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{profile.followersCount}</Text>
              <Text style={styles.statLabel}>FOLLOWERS</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statValue}>{profile.followingCount}</Text>
              <Text style={styles.statLabel}>FOLLOWING</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Playlists</Text>
        {playlists.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No custom playlists yet. Create one in Your Library!
          </Text>
        ) : (
          playlists.slice(0, 5).map((pl) => (
            <Pressable
              key={pl.id}
              onPress={() => router.push(`/playlist/${encodeURIComponent(pl.id)}`)}
              style={styles.plRow}
            >
              <TrackArtwork artworkUrl={pl.artworkUrl} size={50} borderRadius={2} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.plTitle, { color: theme.text }]}>{pl.name}</Text>
                <Text style={[styles.plSub, { color: theme.textSecondary }]}>
                  {pl.trackIds.length} songs
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>
          ))
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
    color: Palette.white,
    marginTop: Spacing.md,
  },
  editPill: {
    marginTop: Spacing.md,
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  editPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Palette.white,
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
    color: Palette.white,
  },
  statLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Palette.mutedText,
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
