import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Spacing } from '@/constants/theme';
import { isTrackDownloadable } from '@/services/sources/sourceRegistry';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme } from '@/store/useSettingsStore';

export default function AlbumOptionsScreen() {
  const { albumId, title: paramTitle, artist: paramArtist } = useLocalSearchParams<{
    albumId: string;
    title?: string;
    artist?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const tracksById = useLibraryStore((s) => s.tracksById);
  const likeAllTracks = useLibraryStore((s) => s.likeAllTracks);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const downloadTrack = useDownloadStore((s) => s.downloadTrack);

  const tracks = useMemo(() => {
    const all = Object.values(tracksById);
    return all.filter(
      (t) =>
        t.albumId === albumId ||
        (paramTitle && t.album?.toLowerCase() === paramTitle.toLowerCase()) ||
        t.album === albumId
    );
  }, [tracksById, albumId, paramTitle]);

  const albumTitle = tracks[0]?.album || paramTitle || 'Collection';
  const artistName = tracks[0]?.artist || paramArtist || 'Artist';
  const artistId = tracks[0]?.artistId || artistName;

  const actions: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
  }[] = [
    {
      icon: 'heart-outline',
      label: 'Like all songs',
      onPress: async () => {
        await likeAllTracks(tracks);
        router.back();
      },
    },
    ...(tracks.some((t) => isTrackDownloadable(t))
      ? [
          {
            icon: 'arrow-down-circle-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Download album',
            onPress: () => {
              for (const t of tracks) {
                if (isTrackDownloadable(t)) {
                  downloadTrack(t).catch(() => {});
                }
              }
              router.back();
            },
          },
        ]
      : []),
    {
      icon: 'person-outline',
      label: 'View artist',
      onPress: () =>
        router.replace({
          pathname: '/artist/[id]',
          params: { id: artistId, name: artistName },
        }),
    },
    ...(tracks[0]
      ? [
          {
            icon: 'share-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Share',
            onPress: () =>
              router.replace({
                pathname: '/share',
                params: { trackId: tracks[0].id },
              }),
          },
        ]
      : []),
    {
      icon: 'list-outline',
      label: 'Add to queue',
      onPress: () => {
        for (const t of tracks) {
          addToQueue(t);
        }
        router.back();
      },
    },
    {
      icon: 'radio-outline',
      label: 'Go to radio',
      onPress: async () => {
        if (tracks[0]) {
          await playTrack(tracks[0], tracks, `${albumTitle} Radio`);
        }
        router.replace('/queue');
      },
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 32,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
      >
        <View style={styles.hero}>
          <TrackArtwork artworkUrl={tracks[0]?.artworkUrl} size={164} />
          <Text style={[styles.title, { color: theme.text }]}>{albumTitle}</Text>
          <Text style={[styles.artist, { color: theme.textSecondary }]}>
            {artistName}
          </Text>
        </View>

        <View style={styles.list}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name={a.icon} size={23} color={theme.text} />
              <Text style={[styles.rowLabel, { color: theme.text }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={[styles.closeText, { color: theme.text }]}>Close</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },
  hero: { alignItems: 'center', marginBottom: Spacing.xxl },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    marginTop: Spacing.lg,
  },
  artist: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    marginTop: 4,
  },
  list: { gap: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rowLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
  },
  closeBtn: {
    alignItems: 'center',
    marginTop: 36,
    paddingVertical: 12,
  },
  closeText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
});
