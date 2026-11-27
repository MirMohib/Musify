import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { MiniPlayer } from '@/components/MiniPlayer';
import { SongTile } from '@/components/SongTile';
import { useDownloadStore } from '@/store/useDownloadStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import type { Track } from '@/types/music';

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
    const { getByText, rerender, queryByText } = await render(<MiniPlayer />);
    expect(getByText('Solar Echoes')).toBeTruthy();
    expect(getByText('THIS PHONE')).toBeTruthy();

    await act(async () => {
      usePlayerStore.setState({ currentTrack: null });
    });
    await rerender(<MiniPlayer />);
    expect(queryByText('Solar Echoes')).toBeNull();
  });
});
