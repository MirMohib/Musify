import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

import { BottomSheetModal } from '@/components/BottomSheetModal';
import { TrackArtwork } from '@/components/TrackArtwork';
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
  const tracksById = useLibraryStore((s) => s.tracksById);
  const playlists = useLibraryStore((s) => s.playlists);
  const likedTrackIds = useLibraryStore((s) => s.likedTrackIds);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const addTrackToPlaylist = useLibraryStore((s) => s.addTrackToPlaylist);
  const removeTrackFromPlaylist = useLibraryStore((s) => s.removeTrackFromPlaylist);
  const [showCreate, setShowCreate] = useState(false);

  if (!track) return null;

  const isLiked = likedTrackIds.includes(track.id);

  return (
    <BottomSheetModal visible={visible} onClose={onClose} maxHeight="72%">
      <View style={[styles.sheetHeader, { borderBottomColor: theme.border }]}>
        <Text style={[styles.sheetTitle, { color: theme.text }]}>Saved in</Text>
        <Pressable onPress={() => setShowCreate(true)} hitSlop={10}>
          <Text style={styles.newPlaylistText}>New playlist</Text>
        </Pressable>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <Pressable
            onPress={() => toggleLike(track).catch(() => {})}
            style={({ pressed }) => [styles.playlistRow, pressed && { opacity: 0.72 }]}
          >
            <LinearGradient
              colors={[Palette.likedGradientStart, Palette.likedGradientEnd]}
              style={styles.likedIconBox}
            >
              <Ionicons name="heart" size={20} color="#FFFFFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.plName, { color: theme.text }]}>Liked Songs</Text>
              <Text style={[styles.plCount, { color: theme.textSecondary }]}>
                {likedTrackIds.length} {likedTrackIds.length === 1 ? 'song' : 'songs'}
              </Text>
            </View>
            <Ionicons
              name={isLiked ? 'checkmark-circle' : 'add-circle-outline'}
              size={24}
              color={isLiked ? Palette.brandGreen : theme.textSecondary}
            />
          </Pressable>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyPlaylistsText, { color: theme.textSecondary }]}>
            Tap &ldquo;New playlist&rdquo; to organize tracks into custom playlists.
          </Text>
        }
        renderItem={({ item }) => {
          const alreadyAdded = item.trackIds.includes(track.id);
          const firstTrack = item.trackIds[0] ? tracksById[item.trackIds[0]] : undefined;
          return (
            <Pressable
              onPress={async () => {
                if (alreadyAdded) {
                  await removeTrackFromPlaylist(item.id, track.id);
                } else {
                  await addTrackToPlaylist(item.id, track);
                }
              }}
              style={({ pressed }) => [styles.playlistRow, pressed && { opacity: 0.72 }]}
            >
              {firstTrack || item.artworkUrl ? (
                <TrackArtwork
                  artworkUrl={item.artworkUrl ?? firstTrack?.artworkUrl}
                  localArtworkUri={firstTrack?.localArtworkUri}
                  artworkAsset={item.artworkAsset ?? firstTrack?.artworkAsset}
                  dominantColor={firstTrack?.dominantColor}
                  size={48}
                  borderRadius={4}
                />
              ) : (
                <View style={[styles.playlistIcon, { backgroundColor: theme.surfaceElevated }]}>
                  <Ionicons name="musical-notes" size={20} color={theme.textSecondary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.plName, { color: theme.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.plCount, { color: theme.textSecondary }]}>
                  {item.trackIds.length} {item.trackIds.length === 1 ? 'song' : 'songs'}
                </Text>
              </View>
              <Ionicons
                name={alreadyAdded ? 'checkmark-circle' : 'add-circle-outline'}
                size={24}
                color={alreadyAdded ? Palette.brandGreen : theme.textSecondary}
              />
            </Pressable>
          );
        }}
      />

      <PlaylistFormModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={async (created) => {
          await addTrackToPlaylist(created.id, track);
        }}
      />
    </BottomSheetModal>
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
  },
  newPlaylistText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Palette.brandGreen,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  likedIconBox: {
    width: 48,
    height: 48,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 2,
  },
  emptyPlaylistsText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    paddingVertical: 14,
  },
});
