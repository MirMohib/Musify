import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddToPlaylistModal } from '@/components/PlaylistModal';
import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Palette, Spacing } from '@/constants/theme';
import { isTrackDownloadable } from '@/services/sources/sourceRegistry';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme } from '@/store/useSettingsStore';
import { formatDuration, getSourceLabel } from '@/utils/format';

export default function TrackOptionsScreen() {
  const { trackId, playlistId } = useLocalSearchParams<{
    trackId: string;
    playlistId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const tracksById = useLibraryStore((s) => s.tracksById);
  const likedTrackIds = useLibraryStore((s) => s.likedTrackIds);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const hideTrack = useLibraryStore((s) => s.hideTrack);
  const removeTrackFromPlaylist = useLibraryStore((s) => s.removeTrackFromPlaylist);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer);

  const downloads = useDownloadStore((s) => s.downloads);
  const downloadTrack = useDownloadStore((s) => s.downloadTrack);
  const deleteDownload = useDownloadStore((s) => s.deleteDownload);

  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);

  const track = (trackId ? tracksById[trackId] : undefined) ?? currentTrack;

  if (!track) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 24 }]}>
        <Text style={[styles.title, { color: theme.text }]}>Track not found</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={[styles.closeText, { color: theme.text }]}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const isLiked = likedTrackIds.includes(track.id);
  const dlRecord = downloads[track.id];
  const isDownloaded = dlRecord?.status === 'completed';
  const canDownload = isTrackDownloadable(track);

  const actions: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color?: string;
    onPress: () => void;
  }[] = [
    {
      icon: isLiked ? 'heart' : 'heart-outline',
      label: isLiked ? 'Liked' : 'Like',
      color: isLiked ? Palette.brandGreen : theme.text,
      onPress: async () => {
        await toggleLike(track);
        router.back();
      },
    },
    ...(canDownload
      ? [
          {
            icon: (isDownloaded ? 'trash-outline' : 'arrow-down-circle-outline') as keyof typeof Ionicons.glyphMap,
            label: isDownloaded ? 'Remove download' : 'Download for offline',
            color: isDownloaded ? Palette.brandGreen : theme.text,
            onPress: async () => {
              if (isDownloaded) {
                await deleteDownload(track.id);
              } else {
                downloadTrack(track).catch((e) =>
                  Alert.alert('Download Error', e instanceof Error ? e.message : 'Failed')
                );
              }
              router.back();
            },
          },
        ]
      : []),
    {
      icon: 'remove-circle-outline',
      label: 'Hide song',
      onPress: () => {
        hideTrack(track.id);
        router.back();
      },
    },
    {
      icon: 'add-circle-outline',
      label: 'Add to playlist',
      onPress: () => setShowPlaylistPicker(true),
    },
    ...(playlistId
      ? [
          {
            icon: 'remove-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Remove from this playlist',
            onPress: async () => {
              await removeTrackFromPlaylist(playlistId, track.id);
              router.back();
            },
          },
        ]
      : []),
    {
      icon: 'list-outline',
      label: 'Add to queue',
      onPress: () => {
        addToQueue(track);
        router.back();
      },
    },
    {
      icon: 'share-outline',
      label: 'Share',
      onPress: () =>
        router.replace({ pathname: '/share', params: { trackId: track.id } }),
    },
    {
      icon: 'radio-outline',
      label: 'Go to radio',
      onPress: async () => {
        const all = Object.values(tracksById).slice(0, 8);
        await playTrack(track, [track, ...all.filter((t) => t.id !== track.id)], `${track.title} Radio`);
        router.replace('/queue');
      },
    },
    {
      icon: 'disc-outline',
      label: 'View album',
      onPress: () => {
        router.replace({
          pathname: '/album/[id]',
          params: {
            id: track.albumId || track.album || track.id,
            title: track.album || track.title,
            artist: track.artist,
          },
        });
      },
    },
    {
      icon: 'person-outline',
      label: 'View artist',
      onPress: () => {
        router.replace({
          pathname: '/artist/[id]',
          params: {
            id: track.artistId || track.artist,
            name: track.artist,
          },
        });
      },
    },
    {
      icon: 'information-circle-outline',
      label: 'Song credits',
      onPress: () => {
        Alert.alert(
          'Song Credits',
          `Title: ${track.title}\nArtist: ${track.artist}\nSource: ${getSourceLabel(
            track.sourceId
          )}\nLicense: ${track.license ?? 'Standard Stream'}\nDuration: ${formatDuration(
            track.durationMs
          )}`
        );
      },
    },
    {
      icon: 'moon-outline',
      label: 'Sleep timer',
      onPress: () => {
        Alert.alert('Sleep Timer', 'Stop audio automatically after:', [
          { text: '15 minutes', onPress: () => setSleepTimer(15) },
          { text: '30 minutes', onPress: () => setSleepTimer(30) },
          { text: '1 hour', onPress: () => setSleepTimer(60) },
          { text: 'Turn off', style: 'destructive', onPress: () => setSleepTimer(null) },
          { text: 'Cancel', style: 'cancel' },
        ]);
      },
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 28,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <TrackArtwork
            artworkUrl={track.artworkUrl}
            artworkAsset={track.artworkAsset}
            dominantColor={track.dominantColor}
            size={164}
            borderRadius={4}
          />
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {track.title}
          </Text>
          <Text style={[styles.artist, { color: theme.textSecondary }]}>
            {track.artist} · {getSourceLabel(track.sourceId)}
          </Text>
        </View>

        <View style={styles.menuList}>
          {actions.map((item) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name={item.icon} size={23} color={item.color ?? theme.text} />
              <Text style={[styles.menuLabel, { color: item.color ?? theme.text }]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={[styles.closeText, { color: theme.text }]}>Close</Text>
        </Pressable>
      </ScrollView>

      <AddToPlaylistModal
        visible={showPlaylistPicker}
        track={track}
        onClose={() => setShowPlaylistPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 19,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  artist: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    marginTop: 4,
  },
  menuList: {
    gap: 18,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  menuLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
  },
  closeBtn: {
    alignItems: 'center',
    marginTop: 28,
    paddingVertical: 12,
  },
  closeText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
});
