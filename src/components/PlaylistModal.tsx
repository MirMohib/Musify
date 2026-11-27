import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useAppTheme } from '@/store/useSettingsStore';
import type { Playlist, Track } from '@/types/music';

interface PlaylistFormModalProps {
  visible: boolean;
  initialPlaylist?: Playlist | null;
  onClose: () => void;
  onCreated?: (playlist: Playlist) => void;
}

function PlaylistFormInner({
  initialPlaylist,
  onClose,
  onCreated,
}: Omit<PlaylistFormModalProps, 'visible'>) {
  const theme = useAppTheme();
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const updatePlaylist = useLibraryStore((s) => s.updatePlaylist);
  const [name, setName] = useState(initialPlaylist?.name ?? '');
  const [description, setDescription] = useState(initialPlaylist?.description ?? '');

  const handleSave = async () => {
    if (!name.trim()) return;
    if (initialPlaylist) {
      await updatePlaylist(initialPlaylist.id, name, description);
    } else {
      const created = await createPlaylist(name, description);
      onCreated?.(created);
    }
    onClose();
  };

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, { backgroundColor: theme.surfaceElevated }]}>
        <Text style={[styles.heading, { color: theme.text }]}>
          {initialPlaylist ? 'Edit playlist' : 'Give your playlist a name'}
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="My Playlist"
          placeholderTextColor={theme.textMuted}
          autoFocus
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.surfaceInput,
            },
          ]}
        />

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Add an optional description"
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.surfaceInput,
              marginTop: Spacing.sm,
            },
          ]}
        />

        <View style={styles.btnRow}>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={[
              styles.saveBtn,
              !name.trim() && { opacity: 0.45 },
            ]}
          >
            <Text style={styles.saveText}>{initialPlaylist ? 'Save' : 'Create'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function PlaylistFormModal({
  visible,
  initialPlaylist,
  onClose,
  onCreated,
}: PlaylistFormModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {visible && (
        <PlaylistFormInner
          key={initialPlaylist?.id ?? 'new'}
          initialPlaylist={initialPlaylist}
          onClose={onClose}
          onCreated={onCreated}
        />
      )}
    </Modal>
  );
}

interface AddToPlaylistModalProps {
  visible: boolean;
  track: Track | null;
  onClose: () => void;
}

export function AddToPlaylistModal({ visible, track, onClose }: AddToPlaylistModalProps) {
  const theme = useAppTheme();
  const playlists = useLibraryStore((s) => s.playlists);
  const addTrackToPlaylist = useLibraryStore((s) => s.addTrackToPlaylist);
  const [showCreate, setShowCreate] = useState(false);

  if (!track) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>Add to playlist</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => setShowCreate(true)}
            style={styles.newPlaylistBtn}
          >
            <Text style={styles.newPlaylistText}>New playlist</Text>
          </Pressable>

          <FlatList
            data={playlists}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const alreadyAdded = item.trackIds.includes(track.id);
              return (
                <Pressable
                  onPress={async () => {
                    await addTrackToPlaylist(item.id, track);
                    onClose();
                  }}
                  style={styles.playlistRow}
                >
                  <View style={styles.playlistIcon}>
                    <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.plName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.plCount, { color: theme.textSecondary }]}>
                      {item.trackIds.length} songs
                    </Text>
                  </View>
                  {alreadyAdded && (
                    <Ionicons name="checkmark-circle" size={22} color={Palette.brandGreen} />
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </View>

      <PlaylistFormModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={async (created) => {
          await addTrackToPlaylist(created.id, track);
          onClose();
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    borderRadius: Radii.xl,
    padding: Spacing.xl,
  },
  heading: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  input: {
    height: 46,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.medium,
    fontSize: 15,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    marginTop: Spacing.xl,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cancelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: Palette.brandGreen,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: Radii.pill,
  },
  saveText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#121212',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '72%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: Spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
  },
  newPlaylistBtn: {
    alignSelf: 'center',
    backgroundColor: Palette.white,
    borderRadius: Radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: Spacing.lg,
  },
  newPlaylistText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#121212',
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: Palette.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
  },
  plCount: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
});
