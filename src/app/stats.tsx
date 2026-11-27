import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DockedMiniPlayerFooter } from '@/components/DockedMiniPlayerFooter';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useAppTheme } from '@/store/useSettingsStore';
import type { MusicSourceId, Track } from '@/types/music';
import { formatBytes, formatDuration, getSourceLabel, hexWithAlpha } from '@/utils/format';

export default function ListeningStatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const tracksById = useLibraryStore((s) => s.tracksById);
  const playlists = useLibraryStore((s) => s.playlists);
  const likedTrackIds = useLibraryStore((s) => s.likedTrackIds);
  const recentlyPlayedIds = useLibraryStore((s) => s.recentlyPlayedIds);

  const downloads = useDownloadStore((s) => s.downloads);
  const totalBytesUsed = useDownloadStore((s) => s.totalBytesUsed);

  const stats = useMemo(() => {
    const allTracks = Object.values(tracksById);
    const recentTracks = recentlyPlayedIds
      .map((id) => tracksById[id])
      .filter((t): t is Track => Boolean(t));

    const completedDownloads = Object.values(downloads).filter(
      (d) => d.status === 'completed'
    ).length;
    const deviceTracksCount = allTracks.filter((t) => t.sourceId === 'local').length;

    const totalRecentMs = recentTracks.reduce((acc, t) => acc + (t.durationMs || 0), 0);

    const artistCounts = new Map<string, number>();
    for (const track of recentTracks) {
      const artist = track.artist?.trim();
      if (!artist) continue;
      artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);
    }
    const topArtists = Array.from(artistCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const sourceCounts = new Map<MusicSourceId, number>();
    const sourcePool = recentTracks.length > 0 ? recentTracks : allTracks;
    for (const track of sourcePool) {
      sourceCounts.set(track.sourceId, (sourceCounts.get(track.sourceId) ?? 0) + 1);
    }
    const topSources = Array.from(sourceCounts.entries()).sort((a, b) => b[1] - a[1]);
    const maxSourceCount = topSources[0]?.[1] ?? 1;

    return {
      recentTracks,
      recentCount: recentTracks.length,
      likedCount: likedTrackIds.length,
      playlistsCount: playlists.length,
      completedDownloads,
      deviceTracksCount,
      totalRecentMs,
      topArtists,
      topSources,
      maxSourceCount,
      isRecentBreakdown: recentTracks.length > 0,
    };
  }, [tracksById, recentlyPlayedIds, downloads, likedTrackIds.length, playlists.length]);

  const cards = [
    {
      label: 'Recent Plays',
      value: String(stats.recentCount),
      sub: stats.totalRecentMs > 0 ? `${formatDuration(stats.totalRecentMs)} total` : 'No recent playback',
      icon: 'time-outline' as const,
      onPress: () => router.push('/recents' as never),
    },
    {
      label: 'Liked Songs',
      value: String(stats.likedCount),
      sub: 'Saved to Favorites',
      icon: 'heart-outline' as const,
      onPress: () => router.push('/(tabs)/library'),
    },
    {
      label: 'Playlists',
      value: String(stats.playlistsCount),
      sub: 'Custom collections',
      icon: 'musical-notes-outline' as const,
      onPress: () => router.push('/(tabs)/library'),
    },
    {
      label: 'Offline Audio',
      value: String(stats.completedDownloads + stats.deviceTracksCount),
      sub: `${formatBytes(totalBytesUsed)} cached · ${stats.deviceTracksCount} device`,
      icon: 'cloud-offline-outline' as const,
      onPress: () => router.push('/downloads'),
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Listening Stats</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {cards.map((card) => (
            <Pressable
              key={card.label}
              onPress={card.onPress}
              style={[styles.statCard, { backgroundColor: theme.surfaceElevated }]}
            >
              <View style={styles.statTopRow}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  {card.label}
                </Text>
                <Ionicons name={card.icon} size={18} color={Palette.brandGreen} />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]}>{card.value}</Text>
              <Text style={[styles.statSub, { color: theme.textSecondary }]} numberOfLines={1}>
                {card.sub}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.surfaceElevated }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Artists</Text>
            {stats.recentCount > 0 && (
              <Pressable onPress={() => router.push('/recents' as never)} hitSlop={8}>
                <Text style={styles.linkText}>See recents</Text>
              </Pressable>
            )}
          </View>

          {stats.topArtists.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Play some tracks to see your most-listened artists here.
            </Text>
          ) : (
            stats.topArtists.map(([artist, count], index) => (
              <Pressable
                key={artist}
                onPress={() => router.push(`/artist/${encodeURIComponent(artist)}`)}
                style={[
                  styles.listRow,
                  index < stats.topArtists.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.rankNum, { color: Palette.brandGreen }]}>
                  {index + 1}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                    {artist}
                  </Text>
                  <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                    {count} {count === 1 ? 'track' : 'tracks'} in recent history
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </Pressable>
            ))
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.surfaceElevated }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {stats.isRecentBreakdown ? 'Recent Playback by Source' : 'Indexed Library by Source'}
          </Text>

          {stats.topSources.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No indexed sources yet. Search or scan device audio to get started.
            </Text>
          ) : (
            stats.topSources.map(([sourceId, count]) => {
              const widthPct = Math.max(8, Math.round((count / stats.maxSourceCount) * 100));
              return (
                <View key={sourceId} style={styles.sourceItem}>
                  <View style={styles.sourceTop}>
                    <Text style={[styles.rowTitle, { color: theme.text }]}>
                      {getSourceLabel(sourceId)}
                    </Text>
                    <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                      {count} {count === 1 ? 'track' : 'tracks'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.barTrack,
                      { backgroundColor: hexWithAlpha(theme.text, 0.1) },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        { width: `${widthPct}%`, backgroundColor: Palette.brandGreen },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <DockedMiniPlayerFooter />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 28,
    gap: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    gap: 6,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
  },
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: 26,
    letterSpacing: -0.4,
  },
  statSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
  },
  sectionCard: {
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  linkText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Palette.brandGreen,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    lineHeight: 19,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  rankNum: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    width: 20,
    textAlign: 'center',
  },
  rowTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14.5,
  },
  rowSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 1,
  },
  sourceItem: {
    gap: 6,
  },
  sourceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
});
