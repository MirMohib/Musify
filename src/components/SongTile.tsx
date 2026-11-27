import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TrackArtwork } from '@/components/TrackArtwork';
import { FontFamily, Palette, Radii, Spacing } from '@/constants/theme';
import { isTrackDownloadable } from '@/services/sources/sourceRegistry';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useAppTheme } from '@/store/useSettingsStore';
import type { DownloadRecord, Track } from '@/types/music';
import { formatDuration, getSourceLabel } from '@/utils/format';

interface SongTileProps {
  track: Track;
  isActive?: boolean;
  showArtwork?: boolean;
  showSourceBadge?: boolean;
  showDownloadAction?: boolean;
  downloadRecord?: DownloadRecord;
  indexNumber?: number;
  onPress: () => void;
  onMorePress?: () => void;
  onDownloadPress?: () => void;
}

export const SongTile = React.memo(function SongTile({
  track,
  isActive = false,
  showArtwork = true,
  showSourceBadge = false,
  showDownloadAction = true,
  downloadRecord,
  indexNumber,
  onPress,
  onMorePress,
  onDownloadPress,
}: SongTileProps) {
  const theme = useAppTheme();
  const storeDownloadRecord = useDownloadStore((s) => s.downloads[track.id]);
  const downloadTrack = useDownloadStore((s) => s.downloadTrack);
  const pauseDownload = useDownloadStore((s) => s.pauseDownload);
  const resumeDownload = useDownloadStore((s) => s.resumeDownload);

  const effectiveDownload = downloadRecord ?? storeDownloadRecord;
  const isDownloaded = effectiveDownload?.status === 'completed';
  const isDownloading = effectiveDownload?.status === 'downloading';
  const isPaused = effectiveDownload?.status === 'paused';
  const canDownload = isTrackDownloadable(track);

  const handleDownloadAction = async () => {
    Haptics.selectionAsync().catch(() => {});
    if (onDownloadPress) {
      onDownloadPress();
      return;
    }
    try {
      if (isDownloading) {
        await pauseDownload(track.id);
      } else if (isPaused) {
        await resumeDownload(track);
      } else if (!isDownloaded) {
        await downloadTrack(track);
      }
    } catch (err) {
      Alert.alert(
        'Download Failed',
        err instanceof Error ? err.message : 'Unable to download this track.'
      );
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { opacity: 0.72 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Play ${track.title} by ${track.artist}`}
    >
      {indexNumber !== undefined && (
        <Text
          style={[
            styles.indexText,
            { color: isActive ? Palette.brandGreen : theme.textSecondary },
          ]}
        >
          {indexNumber}
        </Text>
      )}

      {showArtwork && (
        <TrackArtwork
          artworkUrl={track.artworkUrl}
          artworkAsset={track.artworkAsset}
          dominantColor={track.dominantColor}
          size={48}
          borderRadius={4}
          style={styles.artwork}
        />
      )}

      <View style={styles.meta}>
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            { color: isActive ? Palette.brandGreen : theme.text },
          ]}
        >
          {track.title}
        </Text>

        <View style={styles.subtitleRow}>
          {isDownloaded && (
            <View style={styles.downloadedBadge}>
              <Ionicons name="arrow-down" size={9} color="#121212" />
            </View>
          )}
          {track.explicit && (
            <View style={styles.explicitBadge}>
              <Text style={styles.explicitText}>E</Text>
            </View>
          )}
          <Text
            numberOfLines={1}
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            {track.artist}
            {showSourceBadge ? ` · ${getSourceLabel(track.sourceId)}` : ''}
            {track.durationMs > 0 && !showSourceBadge ? ` · ${formatDuration(track.durationMs)}` : ''}
          </Text>
        </View>

        {isDownloading && (
          <View style={styles.inlineProgressTrack}>
            <View
              style={[
                styles.inlineProgressFill,
                { width: `${Math.round((effectiveDownload?.progress ?? 0) * 100)}%` },
              ]}
            />
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {showDownloadAction && canDownload && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              handleDownloadAction();
            }}
            hitSlop={10}
            style={styles.actionBtn}
            accessibilityLabel={
              isDownloaded
                ? 'Downloaded for offline playback'
                : isDownloading
                  ? 'Downloading, tap to pause'
                  : 'Download track'
            }
          >
            {isDownloading ? (
              <View style={styles.dlProgressWrap}>
                <ActivityIndicator size="small" color={Palette.brandGreen} />
                <Text style={styles.dlPct}>
                  {Math.round((effectiveDownload?.progress ?? 0) * 100)}%
                </Text>
              </View>
            ) : isDownloaded ? (
              <Ionicons name="checkmark-circle" size={21} color={Palette.brandGreen} />
            ) : isPaused ? (
              <Ionicons name="pause-circle-outline" size={21} color={Palette.warning} />
            ) : (
              <Ionicons name="arrow-down-circle-outline" size={21} color={theme.textSecondary} />
            )}
          </Pressable>
        )}

        {onMorePress && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onMorePress();
            }}
            hitSlop={10}
            style={styles.actionBtn}
            accessibilityLabel={`More options for ${track.title}`}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    minHeight: 62,
  },
  indexText: {
    width: 24,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    textAlign: 'center',
    marginRight: Spacing.sm,
  },
  artwork: {
    marginRight: Spacing.md,
  },
  meta: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  downloadedBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Palette.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explicitBadge: {
    width: 14,
    height: 14,
    borderRadius: Radii.xs,
    backgroundColor: Palette.neutral02,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explicitText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#121212',
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    flexShrink: 1,
  },
  inlineProgressTrack: {
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginTop: 2,
    overflow: 'hidden',
  },
  inlineProgressFill: {
    height: '100%',
    backgroundColor: Palette.brandGreen,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: Spacing.sm,
  },
  actionBtn: {
    padding: 4,
  },
  dlProgressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dlPct: {
    fontFamily: FontFamily.bold,
    fontSize: 10.5,
    color: Palette.brandGreen,
  },
});
