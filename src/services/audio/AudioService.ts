/**
 * Abstracted audio playback layer for Musify.
 * Currently backed by `expo-audio` for Expo Go compatibility.
 *
 * To migrate to `react-native-track-player` in an EAS development build:
 * 1. Implement `AudioBackend` with `TrackPlayer` calls + lock-screen event listeners.
 * 2. Swap `createDefaultAudioBackend()` to return `new TrackPlayerBackend()`.
 * Store and UI layers only depend on `AudioService` / `AudioPlaybackStatus`.
 */

import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';
import type { Track } from '@/types/music';

export interface AudioPlaybackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMs: number;
  durationMs: number;
  didJustFinish: boolean;
  error: string | null;
}

export type AudioStatusListener = (status: AudioPlaybackStatus) => void;

export interface AudioBackend {
  initialize(): Promise<void>;
  loadAndPlay(uri: string, track: Track): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  setPlaybackRate(rate: number): Promise<void>;
  subscribe(listener: AudioStatusListener): () => void;
  dispose(): Promise<void>;
}

class ExpoAudioBackend implements AudioBackend {
  private player: AudioPlayer | null = null;
  private listeners = new Set<AudioStatusListener>();
  private statusSub: { remove: () => void } | null = null;
  private lastFinishTrackId: string | null = null;
  private currentTrackId: string | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
      });
    } catch {
      // Some web/simulator contexts ignore background mode flags; continue safely.
    }
    this.initialized = true;
  }

  private ensurePlayer(): AudioPlayer {
    if (!this.player) {
      this.player = createAudioPlayer(null, {
        updateInterval: 250,
        keepAudioSessionActive: true,
      });
      this.statusSub = this.player.addListener(
        'playbackStatusUpdate',
        (status: AudioStatus) => {
          const didJustFinish =
            Boolean(status.didJustFinish) &&
            this.currentTrackId !== null &&
            this.lastFinishTrackId !== this.currentTrackId;

          if (didJustFinish) {
            this.lastFinishTrackId = this.currentTrackId;
          }

          const mapped: AudioPlaybackStatus = {
            isLoaded: status.isLoaded,
            isPlaying: status.playing,
            isBuffering: status.isBuffering,
            positionMs: Math.max(0, Math.round((status.currentTime || 0) * 1000)),
            durationMs: Math.max(0, Math.round((status.duration || 0) * 1000)),
            didJustFinish,
            error: status.error ?? null,
          };

          for (const listener of this.listeners) {
            listener(mapped);
          }
        }
      );
    }
    return this.player;
  }

  async loadAndPlay(uri: string, track: Track): Promise<void> {
    await this.initialize();
    const player = this.ensurePlayer();
    this.currentTrackId = track.id;
    this.lastFinishTrackId = null;

    player.replace({ uri, name: track.title });
    try {
      player.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.artist,
        albumTitle: track.album,
        artworkUrl: track.localArtworkUri || track.artworkUrl,
      });
    } catch {
      // Lock screen controls may require native dev build on certain targets.
    }
    player.play();
  }

  async play(): Promise<void> {
    if (!this.player) return;
    this.lastFinishTrackId = null;
    this.player.play();
  }

  async pause(): Promise<void> {
    if (!this.player) return;
    this.player.pause();
  }

  async seekTo(positionMs: number): Promise<void> {
    if (!this.player) return;
    const seconds = Math.max(0, positionMs / 1000);
    await this.player.seekTo(seconds);
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.player) return;
    this.player.volume = Math.max(0, Math.min(1, volume));
  }

  async setPlaybackRate(rate: number): Promise<void> {
    if (!this.player) return;
    this.player.setPlaybackRate(rate);
  }

  subscribe(listener: AudioStatusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async dispose(): Promise<void> {
    this.statusSub?.remove();
    this.statusSub = null;
    if (this.player) {
      try {
        this.player.clearLockScreenControls();
      } catch {
        // ignore
      }
      this.player.remove();
      this.player = null;
    }
  }
}

export const audioService: AudioBackend = new ExpoAudioBackend();
