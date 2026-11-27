import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DockedMiniPlayerFooter } from '@/components/DockedMiniPlayerFooter';
import { PlaylistCard } from '@/components/PlaylistCard';
import { SongTile } from '@/components/SongTile';
import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { searchAllSources } from '@/services/sources/sourceRegistry';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';
import type { Track } from '@/types/music';

export default function ArtistScreen() {
  const { id, name: paramName } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const offlineOnly = useSettingsStore((s) => s.settings.offlineOnly);

  const decodedId = id ? decodeURIComponent(id) : '';
  const decodedName = paramName ? decodeURIComponent(paramName) : '';

  const tracksById = useLibraryStore((s) => s.tracksById);
  const registerTracks = useLibraryStore((s) => s.registerTracks);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);

  const [following, setFollowing] = useState(false);
  const [resolvedArtist, setResolvedArtist] = useState<string | null>(null);
  const [fetchedTracks, setFetchedTracks] = useState<Track[]>([]);

  const cachedMatches = useMemo(() => {
    const all = Object.values(tracksById);
    return all.filter(
      (t) =>
        t.artistId === decodedId ||
        (decodedName && t.artist.toLowerCase() === decodedName.toLowerCase()) ||
        t.artist.toLowerCase() === decodedId.toLowerCase()
    );
  }, [tracksById, decodedId, decodedName]);

  const artistName =
    decodedName || cachedMatches[0]?.artist || (decodedId.includes(':') ? 'Artist' : decodedId) || 'Artist';
  const shouldFetch = !offlineOnly && Boolean(artistName) && artistName !== 'Artist';
  const loading = shouldFetch && resolvedArtist !== artistName;

  useEffect(() => {
    if (!shouldFetch) return;
    let cancelled = false;
    searchAllSources(artistName, false)
      .then((out) => {
        if (!cancelled) {
          const filtered = out.tracks.filter(
            (t) =>
              t.artist.toLowerCase().includes(artistName.toLowerCase()) ||
              artistName.toLowerCase().includes(t.artist.toLowerCase())
          );
          if (filtered.length > 0) {
            registerTracks(filtered);
            setFetchedTracks(filtered);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setResolvedArtist(artistName);
      });
    return () => {
      cancelled = true;
    };
  }, [shouldFetch, artistName, registerTracks]);

  const artistTracks = useMemo(() => {
    const map = new Map<string, Track>();
    for (const t of [...cachedMatches, ...fetchedTracks]) {
      map.set(t.id, t);
    }
    return Array.from(map.values());
  }, [cachedMatches, fetchedTracks]);

  const artistAlbums = useMemo(() => {
    const map = new Map<string, { id: string; title: string; artworkUrl?: string; year?: number }>();
    for (const t of artistTracks) {
      if (!t.album) continue;
      const key = t.albumId || t.album;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          title: t.album,
          artworkUrl: t.artworkUrl,
          year: t.year,
        });
      }
    }
    return Array.from(map.values());
  }, [artistTracks]);

  const heroTrack = artistTracks[0];
  const isArtistPlaying = isPlaying && artistTracks.some((t) => t.id === currentTrack?.id);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[heroTrack?.dominantColor || '#434343', theme.background]}
          style={[styles.hero, { paddingTop: insets.top + 8 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={Palette.white} />
          </Pressable>

          <View style={styles.avatarRow}>
            <TrackArtwork
              artworkUrl={heroTrack?.artworkUrl}
              dominantColor={heroTrack?.dominantColor}
              size={136}
              circular
            />
          </View>

          <Text style={styles.name}>{artistName}</Text>
          <Text style={styles.followers}>
            {artistTracks.length} track{artistTracks.length === 1 ? '' : 's'} available
          </Text>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => setFollowing((f) => !f)}
              style={[styles.followBtn, following && { borderColor: Palette.brandGreen }]}
            >
              <Text style={styles.followText}>{following ? 'Following' : 'Follow'}</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                isArtistPlaying
                  ? togglePlayPause()
                  : artistTracks[0] && playTrack(artistTracks[0], artistTracks, artistName)
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

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Tracks</Text>
          {loading && <ActivityIndicator size="small" color={Palette.brandGreen} />}
        </View>

        {artistTracks.length === 0 && !loading ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No tracks found for {artistName}.
          </Text>
        ) : (
          artistTracks.map((t, index) => (
            <SongTile
              key={t.id}
              track={t}
              indexNumber={index + 1}
              isActive={currentTrack?.id === t.id}
              showSourceBadge
              showDownloadAction
              onPress={() => playTrack(t, artistTracks, artistName)}
              onMorePress={() =>
                router.push({ pathname: '/track-options', params: { trackId: t.id } })
              }
            />
          ))
        )}

        {artistAlbums.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: Spacing.lg }]}>
              Releases
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
            >
              {artistAlbums.map((alb) => (
                <PlaylistCard
                  key={alb.id}
                  title={alb.title}
                  subtitle={`${alb.year ?? 'Release'} · Album`}
                  artworkUrl={alb.artworkUrl}
                  size={140}
                  onPress={() =>
                    router.push({
                      pathname: '/album/[id]',
                      params: { id: alb.id, title: alb.title, artist: artistName },
                    })
                  }
                />
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>

      <DockedMiniPlayerFooter />
    </View>
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
    fontSize: 30,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 19,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
