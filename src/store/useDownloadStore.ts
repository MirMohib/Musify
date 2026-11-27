import { create } from 'zustand';

import {
  getDownloadedStorageBytes,
  pauseTrackDownload,
  removeTrackDownload,
  resumeTrackDownload,
  startTrackDownload,
} from '@/services/downloads/downloadManager';
import { getDownloadsDb } from '@/services/storage/database';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { DownloadRecord, Track } from '@/types/music';

interface DownloadState {
  downloads: Record<string, DownloadRecord>;
  totalBytesUsed: number;
  hydrate: () => Promise<void>;
  downloadTrack: (track: Track) => Promise<void>;
  pauseDownload: (trackId: string) => Promise<void>;
  resumeDownload: (track: Track) => Promise<void>;
  deleteDownload: (trackId: string) => Promise<void>;
  clearAllDownloads: () => Promise<void>;
}

function toMap(records: DownloadRecord[]): Record<string, DownloadRecord> {
  const map: Record<string, DownloadRecord> = {};
  for (const r of records) {
    map[r.trackId] = r;
  }
  return map;
}

export const useDownloadStore = create<DownloadState>((set, get) => {
  const applyRecord = (record: DownloadRecord) => {
    if (record.status === 'completed' && (record.localArtworkUri || record.localUri)) {
      const existingTrack = useLibraryStore.getState().tracksById[record.trackId];
      if (existingTrack) {
        useLibraryStore.getState().registerTracks([
          {
            ...existingTrack,
            localUri: record.localUri ?? existingTrack.localUri,
            localArtworkUri: record.localArtworkUri ?? existingTrack.localArtworkUri,
          },
        ]);
      }
    }
    set((state) => {
      const next = { ...state.downloads };
      if (record.status === 'cancelled') {
        delete next[record.trackId];
      } else {
        next[record.trackId] = record;
      }
      return {
        downloads: next,
        totalBytesUsed: getDownloadedStorageBytes(next),
      };
    });
  };

  return {
    downloads: {},
    totalBytesUsed: 0,

    hydrate: async () => {
      const list = await getDownloadsDb();
      // Normalize any interrupted in-flight downloads from a previous session to paused
      const normalized = list.map((r) =>
        r.status === 'downloading' ? { ...r, status: 'paused' as const } : r
      );
      const map = toMap(normalized);
      set({
        downloads: map,
        totalBytesUsed: getDownloadedStorageBytes(map),
      });
    },

    downloadTrack: async (track) => {
      const settings = useSettingsStore.getState().settings;
      await startTrackDownload(track, settings, get().downloads, applyRecord);
    },

    pauseDownload: async (trackId) => {
      await pauseTrackDownload(trackId, get().downloads[trackId], applyRecord);
    },

    resumeDownload: async (track) => {
      const rec = get().downloads[track.id];
      const settings = useSettingsStore.getState().settings;
      if (!rec) {
        await startTrackDownload(track, settings, get().downloads, applyRecord);
        return;
      }
      await resumeTrackDownload(track, settings, rec, get().downloads, applyRecord);
    },

    deleteDownload: async (trackId) => {
      const rec = get().downloads[trackId];
      await removeTrackDownload(trackId, rec);
      set((state) => {
        const next = { ...state.downloads };
        delete next[trackId];
        return {
          downloads: next,
          totalBytesUsed: getDownloadedStorageBytes(next),
        };
      });
    },

    clearAllDownloads: async () => {
      const entries = Object.entries(get().downloads);
      for (const [trackId, rec] of entries) {
        await removeTrackDownload(trackId, rec);
      }
      set({ downloads: {}, totalBytesUsed: 0 });
    },
  };
});
