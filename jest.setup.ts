// Jest global setup & native Expo module mocks for Musify unit tests

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('expo-sqlite', () => {
  const mockDb = {
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve({ changes: 1, lastInsertRowId: 1 })),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(() => Promise.resolve(null)),
    closeAsync: jest.fn(() => Promise.resolve()),
  };
  return {
    openDatabaseAsync: jest.fn(() => Promise.resolve(mockDb)),
    __mockDb: mockDb,
  };
});

jest.mock('expo-audio', () => {
  const mockPlayer = {
    id: 'mock-player',
    playing: false,
    muted: false,
    loop: false,
    paused: true,
    isLoaded: true,
    isBuffering: false,
    currentTime: 0,
    duration: 180,
    volume: 1,
    playbackRate: 1,
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    setPlaybackRate: jest.fn(),
    setActiveForLockScreen: jest.fn(),
    clearLockScreenControls: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  };
  return {
    createAudioPlayer: jest.fn(() => mockPlayer),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    __mockPlayer: mockPlayer,
  };
});

jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    exists = false;
    size = 0;
    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = parts
        .map((p) => (typeof p === 'string' ? p : p.uri))
        .join('/')
        .replace(/\/+/g, '/');
    }
    copy = jest.fn();
    delete = jest.fn(() => {
      this.exists = false;
    });
  }

  class MockDirectory {
    uri: string;
    exists = true;
    constructor(...parts: Array<string | { uri: string }>) {
      this.uri = parts
        .map((p) => (typeof p === 'string' ? p : p.uri))
        .join('/')
        .replace(/\/+/g, '/');
    }
    create = jest.fn(() => {
      this.exists = true;
    });
  }

  const MockDownloadTask = jest.fn(
    (
      url: string,
      destination: MockFile | MockDirectory,
      options?: { onProgress?: (p: { bytesWritten: number; totalBytes: number }) => void }
    ) => ({
      state: 'idle' as 'idle' | 'active' | 'paused' | 'completed' | 'cancelled' | 'error',
      url,
      destination,
      options,
      downloadAsync: jest.fn(async () => destination as MockFile),
      pauseAsync: jest.fn(async function (this: { state: string }) {
        this.state = 'paused';
      }),
      resumeAsync: jest.fn(async () => destination as MockFile),
      cancel: jest.fn(function (this: { state: string }) {
        this.state = 'cancelled';
      }),
      release: jest.fn(),
      savable: jest.fn(() => ({
        url,
        fileUri: destination.uri,
        isDirectory: false,
        resumeData: 'mock-resume-token',
      })),
    })
  ) as jest.Mock & { fromSavable: jest.Mock };

  MockDownloadTask.fromSavable = jest.fn(
    (
      state: { url: string; fileUri: string },
      options?: { onProgress?: (p: { bytesWritten: number; totalBytes: number }) => void }
    ) => {
      const task = MockDownloadTask(state.url, new MockFile(state.fileUri), options);
      task.state = 'paused';
      return task;
    }
  );

  return {
    File: MockFile,
    Directory: MockDirectory,
    DownloadTask: MockDownloadTask,
    Paths: {
      document: new MockDirectory('file:///mock-documents'),
      cache: new MockDirectory('file:///mock-cache'),
    },
  };
});

jest.mock('expo-media-library', () => {
  const MockQuery = jest.fn(() => {
    const query: {
      eq: jest.Mock;
      orderBy: jest.Mock;
      limit: jest.Mock;
      exe: jest.Mock;
    } = {
      eq: jest.fn(() => query),
      orderBy: jest.fn(() => query),
      limit: jest.fn(() => query),
      exe: jest.fn(async () => []),
    };
    return query;
  });
  return {
    Query: MockQuery,
    AssetField: {
      MEDIA_TYPE: 'mediaType',
      MODIFICATION_TIME: 'modificationTime',
    },
    MediaType: {
      AUDIO: 'audio',
      IMAGE: 'image',
      VIDEO: 'video',
    },
    getPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
  };
});

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));
