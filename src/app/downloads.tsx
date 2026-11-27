import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DockedMiniPlayerFooter } from '@/components/DockedMiniPlayerFooter';
import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAppTheme, useSettingsStore } from '@/store/useSettingsStore';
import { formatBytes } from '@/utils/format';

export default function DownloadsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const tracksById = useLibraryStore((s) => s.tracksById);

  const downloads = useDownloadStore((s) => s.downloads);
  const totalBytesUsed = useDownloadStore((s) => s.totalBytesUsed);
  const pauseDownload = useDownloadStore((s) => s.pauseDownload);
  const resumeDownload = useDownloadStore((s) => s.resumeDownload);
  const deleteDownload = useDownloadStore((s) => s.deleteDownload);
  const clearAllDownloads = useDownloadStore((s) => s.clearAllDownloads);

  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const allRecords = useMemo(() => Object.values(downloads), [downloads]);
  const inProgress = allRecords.filter((r) => r.status !== 'completed');
  const completed = allRecords.filter((r) => r.status === 'completed');

  const completedTracks = useMemo(
    () => completed.map((r) => tracksById[r.trackId]).filter(Boolean),
    [completed, tracksById]
  );

  const maxBytes = settings.maxDownloadStorageMb * 1024 * 1024;
  const storageRatio = maxBytes > 0 ? Math.min(1, totalBytesUsed / maxBytes) : 0;

  const confirmClearAll = () => {
    Alert.alert('Remove all downloads?', 'All offline audio files will be deleted from storage.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete All', style: 'destructive', onPress: clearAllDownloads },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Downloads &amp; Offline</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.surfaceElevated }]}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Offline only mode</Text>
              <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                Only play downloaded tracks and local device music without using internet.
              </Text>
            </View>
            <Switch
              value={settings.offlineOnly}
              onValueChange={(v) => updateSettings({ offlineOnly: v })}
              trackColor={{ false: '#555', true: Palette.brandGreen }}
              thumbColor={Palette.white}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surfaceElevated }]}>
          <View style={styles.storageTop}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Storage usage</Text>
            <Text style={[styles.storageNums, { color: theme.textSecondary }]}>
              {formatBytes(totalBytesUsed)} / {settings.maxDownloadStorageMb} MB
            </Text>
          </View>

          <View style={styles.meterTrack}>
            <View style={[styles.meterFill, { width: `${storageRatio * 100}%` }]} />
          </View>

          <View style={styles.storageFooter}>
            <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
              Location: {settings.downloadLocation === 'documents' ? 'App Documents' : 'Cache'}
            </Text>
            {allRecords.length > 0 && (
              <Pressable onPress={confirmClearAll}>
                <Text style={styles.clearAllText}>Remove all</Text>
              </Pressable>
            )}
          </View>
        </View>

        {inProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>
              Active &amp; Paused ({inProgress.length})
            </Text>
            {inProgress.map((rec) => {
              const track = tracksById[rec.trackId];
              if (!track) return null;
              const isPaused = rec.status === 'paused';
              const isError = rec.status === 'error';
              return (
                <View
                  key={rec.trackId}
                  style={[styles.dlRow, { backgroundColor: theme.surface }]}
                >
                  <TrackArtwork artworkUrl={track.artworkUrl} size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dlTitle, { color: theme.text }]} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={[styles.dlSub, { color: theme.textSecondary }]} numberOfLines={1}>
                      {isError
                        ? rec.error || 'Error'
                        : isPaused
                          ? `Paused · ${Math.round(rec.progress * 100)}%`
                          : `Downloading · ${Math.round(rec.progress * 100)}%`}
                    </Text>
                    <View style={styles.dlProgressBg}>
                      <View
                        style={[
                          styles.dlProgressFill,
                          {
                            width: `${Math.round(rec.progress * 100)}%`,
                            backgroundColor: isError ? Palette.danger : Palette.brandGreen,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.dlActions}>
                    {rec.status === 'downloading' ? (
                      <Pressable onPress={() => pauseDownload(rec.trackId)} hitSlop={8}>
                        <Ionicons name="pause-circle" size={26} color={theme.text} />
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => resumeDownload(track)} hitSlop={8}>
                        <Ionicons name="play-circle" size={26} color={Palette.brandGreen} />
                      </Pressable>
                    )}
                    <Pressable onPress={() => deleteDownload(rec.trackId)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={21} color={Palette.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>
            Downloaded Tracks ({completed.length})
          </Text>
          {completed.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No downloaded tracks yet. Tap the download icon on any track from Home, Search,
              Albums, or Full Player to save it for offline playback.
            </Text>
          ) : (
            completed.map((rec) => {
              const track = tracksById[rec.trackId];
              if (!track) return null;
              const isActive = currentTrack?.id === track.id;
              return (
                <Pressable
                  key={rec.trackId}
                  onPress={() => playTrack(track, completedTracks, 'Downloads')}
                  style={styles.completedRow}
                >
                  <TrackArtwork artworkUrl={track.artworkUrl} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.dlTitle,
                        { color: isActive ? Palette.brandGreen : theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {track.title}
                    </Text>
                    <Text style={[styles.dlSub, { color: theme.textSecondary }]} numberOfLines={1}>
                      {track.artist} · {formatBytes(rec.bytesWritten || rec.totalBytes)}
                    </Text>
                  </View>
                  <Pressable onPress={() => deleteDownload(rec.trackId)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={20} color={theme.textSecondary} />
                  </Pressable>
                </Pressable>
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
    fontSize: 18,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 24,
    gap: 14,
  },
  card: {
    borderRadius: Radii.lg,
    padding: Spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15.5,
  },
  cardSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 4,
  },
  storageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storageNums: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
  },
  meterTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginVertical: Spacing.md,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    backgroundColor: Palette.brandGreen,
    borderRadius: 3,
  },
  storageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearAllText: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: Palette.danger,
  },
  section: {
    marginTop: Spacing.sm,
    gap: 10,
  },
  sectionHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
  },
  dlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: 12,
  },
  dlTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14.5,
  },
  dlSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  dlProgressBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginTop: 6,
    overflow: 'hidden',
  },
  dlProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  dlActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    lineHeight: 20,
  },
});
