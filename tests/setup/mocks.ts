/**
 * Native-module fakes for Jest. Everything the app persists goes through these, so each
 * test file starts with an empty "device" (Jest gives every file a fresh module registry).
 */
/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>();
  const Storage = {
    getItemSync: (k: string) => store.get(k) ?? null,
    setItemSync: (k: string, v: string) => void store.set(k, v),
    removeItemSync: (k: string) => store.delete(k),
    clearSync: () => store.clear(),
    getAllKeysSync: () => [...store.keys()],
  };
  return { __esModule: true, Storage, default: Storage };
});

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});

jest.mock('expo-crypto', () => {
  const nodeCrypto = require('node:crypto');
  return {
    __esModule: true,
    CryptoDigestAlgorithm: { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA512: 'SHA-512' },
    randomUUID: () => nodeCrypto.randomUUID(),
    digestStringAsync: async (algorithm: string, data: string) => nodeCrypto.createHash(algorithm.replace('-', '').toLowerCase()).update(data).digest('hex'),
  };
});

jest.mock('expo-audio', () => ({
  __esModule: true,
  createAudioPlayer: jest.fn(() => ({ volume: 1, play: jest.fn(), pause: jest.fn(), remove: jest.fn(), seekTo: jest.fn(() => Promise.resolve()) })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-speech', () => ({
  __esModule: true,
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
  // No voices by default (like a browser before it has loaded them); tests provide device lists.
  getAvailableVoicesAsync: jest.fn(() => Promise.resolve([])),
}));

// Local notifications: a fake OS schedule the reminder tests can inspect (`__scheduled`).
jest.mock('expo-notifications', () => {
  const scheduled: { identifier: string; content: unknown; trigger: unknown }[] = [];
  const denied = { granted: false, canAskAgain: true, status: 'undetermined' };
  return {
    __esModule: true,
    __scheduled: scheduled,
    AndroidImportance: { MIN: 3, LOW: 4, DEFAULT: 5, HIGH: 6 },
    SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily', WEEKLY: 'weekly', TIME_INTERVAL: 'timeInterval' },
    getPermissionsAsync: jest.fn(() => Promise.resolve(denied)),
    requestPermissionsAsync: jest.fn(() => Promise.resolve(denied)),
    setNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
    setNotificationHandler: jest.fn(),
    scheduleNotificationAsync: jest.fn((req: { identifier: string; content: unknown; trigger: unknown }) => {
      scheduled.push({ identifier: req.identifier, content: req.content, trigger: req.trigger });
      return Promise.resolve(req.identifier);
    }),
    cancelScheduledNotificationAsync: jest.fn((id: string) => {
      const i = scheduled.findIndex((n) => n.identifier === id);
      if (i >= 0) scheduled.splice(i, 1);
      return Promise.resolve();
    }),
    getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve(scheduled.map((n) => ({ ...n })))),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    getLastNotificationResponse: jest.fn(() => null),
    clearLastNotificationResponse: jest.fn(),
  };
});

jest.mock('expo-haptics', () => ({
  __esModule: true,
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-network', () => ({
  __esModule: true,
  getNetworkStateAsync: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true, type: 'WIFI' })),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('expo-updates', () => ({
  __esModule: true,
  isEnabled: false,
  checkForUpdateAsync: jest.fn(() => Promise.resolve({ isAvailable: false })),
  fetchUpdateAsync: jest.fn(() => Promise.resolve({})),
  reloadAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-screen-orientation', () => ({
  __esModule: true,
  OrientationLock: { DEFAULT: 0, PORTRAIT_UP: 3 },
  lockAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    dismiss: jest.fn(),
    canGoBack: jest.fn(() => true),
  };
  const params = () => (globalThis as { __routeParams?: Record<string, string> }).__routeParams ?? {};
  const Stack = Object.assign(({ children }: { children?: unknown }) => children ?? null, { Screen: () => null });
  return {
    __esModule: true,
    router,
    useRouter: () => router,
    useLocalSearchParams: params,
    useGlobalSearchParams: params,
    usePathname: () => '/',
    useSegments: () => [],
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
    Link: ({ children }: { children?: unknown }) => children ?? null,
    // A jest.fn so tests can read where a screen redirected to (`Redirect.mock.calls`).
    Redirect: jest.fn(() => null),
    Stack,
  };
});

jest.mock('expo-router/js-tabs', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Screen = ({ name }: { name: string }) => React.createElement(View, { testID: `tab-${name}` });
  const Tabs = ({ children }: { children?: unknown }) => React.createElement(View, { testID: 'tabs' }, children);
  return { __esModule: true, Tabs: Object.assign(Tabs, { Screen }) };
});

jest.mock('expo-font', () => ({ __esModule: true, useFonts: jest.fn(() => [true, null]), loadAsync: jest.fn(() => Promise.resolve()), isLoaded: () => true }));
jest.mock('expo-splash-screen', () => ({ __esModule: true, preventAutoHideAsync: jest.fn(() => Promise.resolve()), hideAsync: jest.fn(() => Promise.resolve()) }));
jest.mock('expo-status-bar', () => ({ __esModule: true, StatusBar: () => null }));

// Icons are decorative: render each as an empty View tagged with its name (much faster than
// loading ~1,500 real icon modules in every test file).
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const cache = new Map<string, unknown>();
  return new Proxy(
    { __esModule: true },
    {
      get: (target: Record<string, unknown>, name: string) => {
        if (name in target) return target[name];
        if (!cache.has(name)) {
          const Icon = (props: { testID?: string }) => React.createElement(View, { testID: props.testID ?? `icon-${name}` });
          Icon.displayName = name;
          cache.set(name, Icon);
        }
        return cache.get(name);
      },
    },
  );
});

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

require('react-native-gesture-handler/jestSetup');
