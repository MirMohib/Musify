import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaylistCard } from '@/components/PlaylistCard';
import { SongTile } from '@/components/SongTile';
import { TrackArtwork } from '@/components/TrackArtwork';
import { SEEDED_ALBUMS, SEEDED_ARTISTS, SEEDED_TRACKS } from '@/data/seedCatalog';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme } from '@/store/useSettingsStore';

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const decodedId = id ? decodeURIComponent(id) : '';
  const artist = useMemo(
    () =>
      SEEDED_ARTISTS.find((a) => a.id === decodedId || a.name === decodedId) ?? {
        id: decodedId || 'artist',
        sourceId: 'seeded' as const,
        name: decodedId.includes(':') ? 'Featured Artist' : decodedId || 'Featured Artist',
        artworkAsset: SEEDED_ARTISTS[0].artworkAsset,
        followers: 1250000,
        genre: 'Indie & Pop',
        bio: 'Streaming free Creative Commons and independent releases on Musify.',
      },
    [decodedId]
  );

  const tracksById = useLibraryStore((s) => s.tracksById);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const downloads = useDownloadStore((s) => s.downloads);
  const downloadTrack = useDownloadStore((s) => s.downloadTrack);

  const [following, setFollowing] = useState(true);

  const artistTracks = useMemo(() => {
    const all = Object.values(tracksById);
    const matched = all.filter(
      (t) =>
        t.artistId === artist.id ||
        t.artist.toLowerCase().includes(artist.name.toLowerCase())
    );
    return matched.length > 0 ? matched : SEEDED_TRACKS.slice(0, 4);
  }, [tracksById, artist]);

  const isArtistPlaying =
    isPlaying && artistTracks.some((t) => t.id === currentTrack?.id);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={['#434343', theme.background]}
        style={[styles.hero, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={Palette.white} />
        </Pressable>

        <View style={styles.avatarRow}>
          <TrackArtwork
            artworkUrl={artist.artworkUrl}
            artworkAsset={artist.artworkAsset}
            size={136}
            circular
          />
        </View>

        <Text style={styles.name}>{artist.name}</Text>
        <Text style={styles.followers}>
          {(artist.followers ?? 950000).toLocaleString()} monthly listeners
        </Text>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => setFollowing((f) => !f)}
            style={[
              styles.followBtn,
              following && { borderColor: Palette.brandGreen },
            ]}
          >
            <Text style={styles.followText}>{following ? 'Following' : 'Follow'}</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              isArtistPlaying
                ? togglePlayPause()
                : playTrack(artistTracks[0], artistTracks, artist.name)
            }
            style={styles.playCircle}
          >
            <Ionicons
              name={isArtistPlaying ? 'pause' : 'play'}
              size={26}
              color="#121212"
              style={!isArtistPlaying ? { marginLeft: 2 } : undefined}
            />
          </Pressable>
        </View>
      </LinearGradient>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Popular</Text>
      {artistTracks.map((t, index) => (
        <SongTile
          key={t.id}
          track={t}
          indexNumber={index + 1}
          isActive={currentTrack?.id === t.id}
          showDownloadAction
          downloadRecord={downloads[t.id]}
          onPress={() => playTrack(t, artistTracks, artist.name)}
          onDownloadPress={() => downloadTrack(t).catch(() => {})}
          onMorePress={() =>
            router.push({ pathname: '/track-options', params: { trackId: t.id } })
          }
        />
      ))}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Featured Releases</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
      >
        {SEEDED_ALBUMS.map((alb) => (
          <PlaylistCard
            key={alb.id}
            title={alb.title}
            subtitle={`${alb.year ?? 2024} · Album`}
            artworkAsset={alb.artworkAsset}
            size={140}
            onPress={() => router.push(`/album/${encodeURIComponent(alb.id)}`)}
          />
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
  },
  avatarRow: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    color: Palette.white,
    letterSpacing: -0.6,
  },
  followers: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Palette.mutedText,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  followBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  followText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Palette.white,
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 19,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
});
