import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppEntranceLoader } from '@/components/AppEntranceLoader';
import { MiniPlayer } from '@/components/MiniPlayer';
import { AddToPlaylistModal } from '@/components/PlaylistModal';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import { SleepTimerSheet } from '@/components/SleepTimerSheet';
import { SongTile } from '@/components/SongTile';
import { useDownloadStore } from '@/store/useDownloadStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Track } from '@/types/music';

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  Directory: jest.fn(),
  File: jest.fn(),
  Paths: { document: 'file:///docs' },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('expo-image', () => {
  const RN = jest.requireActual('react-native');
  return { Image: RN.View };
});

jest.mock('expo-linear-gradient', () => {
  const RN = jest.requireActual('react-native');
  return { LinearGradient: RN.View };
});

jest.mock('@expo/vector-icons', () => {
  const mockReact = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => mockReact.createElement(RN.Text, null, name),
  };
});

const SAMPLE_TRACK: Track = {
  id: 'archive:sample-1',
  sourceId: 'archive',
  sourceTrackId: 'sample-1',
  title: 'Solar Echoes',
  artist: 'Stellardrone',
  durationMs: 185000,
  isDownloadable: true,
};

const TEST_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

describe('UI components', () => {
  beforeEach(() => {
    useDownloadStore.setState({ downloads: {}, totalBytesUsed: 0 });
    usePlayerStore.setState({
      currentTrack: SAMPLE_TRACK,
      isPlaying: false,
      positionMs: 30000,
      durationMs: 185000,
      activeDeviceName: 'This Phone',
    });
  });

  it('renders SongTile with download button and handles press', async () => {
    const onPress = jest.fn();
    const { getByText, getByLabelText } = await render(
      <SongTile track={SAMPLE_TRACK} showSourceBadge onPress={onPress} />
    );

    expect(getByText('Solar Echoes')).toBeTruthy();
    expect(getByText(/Stellardrone/)).toBeTruthy();
    expect(getByLabelText('Download track')).toBeTruthy();

    await fireEvent.press(getByLabelText('Play Solar Echoes by Stellardrone'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders MiniPlayer when currentTrack is set and hides when null', async () => {
    const { getByText, getByLabelText, rerender, queryByText } = await render(
      <SafeAreaProvider initialMetrics={TEST_METRICS}>
        <MiniPlayer />
      </SafeAreaProvider>
    );
    expect(getByText('Solar Echoes')).toBeTruthy();
    expect(getByText('Stellardrone')).toBeTruthy();
    expect(getByLabelText('Connect to a device')).toBeTruthy();
    expect(getByLabelText('Save to library or playlist')).toBeTruthy();

    await act(async () => {
      usePlayerStore.setState({ currentTrack: null });
    });
    await rerender(
      <SafeAreaProvider initialMetrics={TEST_METRICS}>
        <MiniPlayer />
      </SafeAreaProvider>
    );
    expect(queryByText('Solar Echoes')).toBeNull();
  });

  it('renders Saved in bottom sheet with Liked Songs and playlists', async () => {
    useLibraryStore.setState({
      likedTrackIds: [SAMPLE_TRACK.id],
      playlists: [
        {
          id: 'pl-1',
          name: 'Night Vibes',
          owner: 'You',
          trackIds: [],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    });

    const { getByText } = await render(
      <SafeAreaProvider initialMetrics={TEST_METRICS}>
        <AddToPlaylistModal visible track={SAMPLE_TRACK} onClose={jest.fn()} />
      </SafeAreaProvider>
    );

    expect(getByText('Saved in')).toBeTruthy();
    expect(getByText('New playlist')).toBeTruthy();
    expect(getByText('Liked Songs')).toBeTruthy();
    expect(getByText('Night Vibes')).toBeTruthy();
  });

  it('renders SleepTimerSheet options including End of track', async () => {
    const onClose = jest.fn();
    usePlayerStore.setState({ sleepTimerMode: 'off', sleepTimerEndsAt: null });

    const { getByText } = await render(
      <SafeAreaProvider initialMetrics={TEST_METRICS}>
        <SleepTimerSheet visible onClose={onClose} />
      </SafeAreaProvider>
    );

    expect(getByText('Sleep timer')).toBeTruthy();
    expect(getByText('5 minutes')).toBeTruthy();
    expect(getByText('End of track')).toBeTruthy();

    await fireEvent.press(getByText('End of track'));
    expect(usePlayerStore.getState().sleepTimerMode).toBe('end_of_track');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders ProfileAvatar with initials fallback when no custom avatarUri is set', async () => {
    const onPress = jest.fn();
    useSettingsStore.setState((state) => ({
      profile: { ...state.profile, name: 'Mohib Ali', avatarUri: undefined },
    }));

    const { getByText, getByLabelText } = await render(
      <ProfileAvatar size={40} onPress={onPress} />
    );
    const btn = getByLabelText('Open profile menu');
    expect(btn).toBeTruthy();
    expect(getByText('MA')).toBeTruthy();

    await fireEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders AppEntranceLoader with status text and triggers onFinishExit when ready', async () => {
    jest.useFakeTimers();
    try {
      const onFinishExit = jest.fn();
      const { getByText, getByLabelText, rerender } = await render(
        <AppEntranceLoader
          isReady={false}
          statusText="Loading music library..."
          onFinishExit={onFinishExit}
        />
      );

      expect(getByLabelText('Loading Musify')).toBeTruthy();
      expect(getByText('Musify')).toBeTruthy();
      expect(getByText('Loading music library...')).toBeTruthy();
      expect(onFinishExit).not.toHaveBeenCalled();

      await rerender(
        <AppEntranceLoader
          isReady
          statusText="Ready"
          onFinishExit={onFinishExit}
        />
      );

      await act(async () => {
        jest.advanceTimersByTime(450);
      });

      expect(onFinishExit).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('renders ProfileDrawer with MirMohib developer credit at bottom', async () => {
    useSettingsStore.setState({ isProfileDrawerOpen: true });

    const { getByText } = await render(
      <SafeAreaProvider initialMetrics={TEST_METRICS}>
        <ProfileDrawer />
      </SafeAreaProvider>
    );

    expect(getByText('Settings and privacy')).toBeTruthy();
    expect(getByText('Developed by MirMohib')).toBeTruthy();
  });
});
