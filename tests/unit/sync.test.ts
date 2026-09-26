import * as Network from 'expo-network';
import * as Updates from 'expo-updates';
import { clearDevice } from '../helpers';

type SyncModule = typeof import('@/features/sync/services');
type AppModule = typeof import('@/store/app');
type ContentModule = typeof import('@/features/content/registry');

/** Load the sync service with a given Supabase configuration (read at import time). */
function load(configured: boolean): SyncModule & { useApp: AppModule['useApp']; useContent: ContentModule['useContent'] } {
  process.env.EXPO_PUBLIC_SUPABASE_URL = configured ? 'https://proj.supabase.co' : '';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = configured ? 'anon-key' : '';
  // Stores rehydrate from the fake device at import: start each test from an empty one.
  clearDevice();
  let out!: SyncModule & { useApp: AppModule['useApp']; useContent: ContentModule['useContent'] };
  jest.isolateModules(() => {
    const sync = require('@/features/sync/services') as SyncModule;
    out = { ...sync, useApp: (require('@/store/app') as AppModule).useApp, useContent: (require('@/features/content/registry') as ContentModule).useContent };
  });
  return out;
}

const okFetch = () => jest.fn(async () => ({ ok: true, status: 201, json: async () => ({}) }));

afterEach(() => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  jest.useRealTimers();
});

describe('syncNow', () => {
  it('reports when cloud sync is not configured', async () => {
    const s = load(false);
    expect(s.cloudSyncConfigured()).toBe(false);
    expect(await s.syncNow()).toEqual({ ok: false, message: 'Cloud sync is not configured' });
  });

  it('needs a family first', async () => {
    const s = load(true);
    expect(await s.syncNow()).toEqual({ ok: false, message: 'No family yet' });
  });

  it('uploads every child with the family key, then marks that snapshot synced', async () => {
    const s = load(true);
    global.fetch = okFetch() as unknown as typeof fetch;
    s.useApp.getState().setupFamily('Mum');
    const a = s.useApp.getState().addProfile({ name: 'Adam', level: 3 });
    s.useApp.getState().addProfile({ name: 'Aisyah', level: 1 });
    const res = await s.syncNow();
    expect(res).toEqual({ ok: true, message: 'Synced' });
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://proj.supabase.co/rest/v1/bijak_progress?on_conflict=profile_id');
    const rows = JSON.parse(init.body);
    expect(rows.map((r: { name: string }) => r.name)).toEqual(['Adam', 'Aisyah']);
    expect(rows[0]).toMatchObject({ profile_id: a, level: 3, family_id: s.useApp.getState().parent!.familyId });
    expect(rows[0].family_key).toMatch(/^[0-9a-f]{64}$/);
    expect(init.headers['x-family-key']).toBe(rows[0].family_key);
    const st = s.useApp.getState();
    expect(st.syncedRevision).toBe(st.dirtyAt);
    // Nothing changed since: no second upload.
    expect(await s.syncNow()).toEqual({ ok: true, message: 'Already up to date' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the family key stable across syncs', async () => {
    const s = load(true);
    global.fetch = okFetch() as unknown as typeof fetch;
    s.useApp.getState().setupFamily('Mum');
    s.useApp.getState().addProfile({ name: 'Adam', level: 3 });
    await s.syncNow();
    s.useApp.getState().updateSettings({ sound: false });
    s.useApp.getState().addProfile({ name: 'Ali', level: 2 });
    await s.syncNow();
    const keys = (global.fetch as jest.Mock).mock.calls.map(([, init]) => JSON.parse(init.body)[0].family_key);
    expect(keys[0]).toBe(keys[1]);
  });

  it('progress made while an upload is in flight is not lost (it syncs next time)', async () => {
    const s = load(true);
    s.useApp.getState().setupFamily('Mum');
    const id = s.useApp.getState().addProfile({ name: 'Adam', level: 3 });
    s.useApp.getState().selectProfile(id);
    let finish!: () => void;
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ ok: true, status: 201, json: async () => ({}) } as Response);
        }),
    ) as unknown as typeof fetch;
    const inFlight = s.syncNow();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((r) => setImmediate(r));
    // The child keeps playing during the upload.
    s.useApp.getState().resetProgress(id);
    finish();
    expect(await inFlight).toEqual({ ok: true, message: 'Synced' });
    const st = s.useApp.getState();
    expect(st.dirtyAt).toBeGreaterThan(st.syncedRevision!);
    global.fetch = okFetch() as unknown as typeof fetch;
    expect(await s.syncNow()).toEqual({ ok: true, message: 'Synced' });
  });

  it('stays dirty when offline or when the server fails', async () => {
    const s = load(true);
    s.useApp.getState().setupFamily('Mum');
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValueOnce({ isConnected: false, isInternetReachable: false });
    global.fetch = okFetch() as unknown as typeof fetch;
    expect(await s.syncNow()).toEqual({ ok: false, message: 'Offline — will sync later' });
    expect(global.fetch).not.toHaveBeenCalled();
    global.fetch = jest.fn(async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;
    expect(await s.syncNow()).toEqual({ ok: false, message: 'Supabase HTTP 503' });
    expect(s.useApp.getState().syncedRevision).toBeNull();
  });

  it('refuses to start a second upload while one is running', async () => {
    const s = load(true);
    s.useApp.getState().setupFamily('Mum');
    let finish!: () => void;
    global.fetch = jest.fn(() => new Promise((resolve) => (finish = () => resolve({ ok: true, status: 201 } as Response)))) as unknown as typeof fetch;
    const first = s.syncNow();
    await new Promise((r) => setImmediate(r));
    expect(await s.syncNow()).toEqual({ ok: false, message: 'Sync in progress' });
    finish();
    await first;
  });
});

describe('OTA updates', () => {
  const g = globalThis as { __DEV__?: boolean };
  let dev: boolean | undefined;
  beforeEach(() => {
    dev = g.__DEV__;
  });
  afterEach(() => {
    g.__DEV__ = dev;
    (Updates as { isEnabled: boolean }).isEnabled = false;
  });
  const release = () => {
    g.__DEV__ = false;
    (Updates as { isEnabled: boolean }).isEnabled = true;
  };

  it('are disabled in development builds', async () => {
    const s = load(false);
    expect(await s.checkOtaUpdate()).toBe('disabled');
    expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it('download a waiting update in release builds (applied on next launch)', async () => {
    const s = load(false);
    release();
    (Updates.checkForUpdateAsync as jest.Mock).mockResolvedValueOnce({ isAvailable: true });
    expect(await s.checkOtaUpdate()).toBe('downloaded');
    expect(Updates.fetchUpdateAsync).toHaveBeenCalled();
  });

  it('report “none” when up to date or when the check fails', async () => {
    const s = load(false);
    release();
    (Updates.checkForUpdateAsync as jest.Mock).mockResolvedValueOnce({ isAvailable: false });
    expect(await s.checkOtaUpdate()).toBe('none');
    (Updates.checkForUpdateAsync as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    expect(await s.checkOtaUpdate()).toBe('none');
  });
});

describe('background services', () => {
  it('check for content shortly after launch and clean up on stop', () => {
    jest.useFakeTimers();
    const s = load(false);
    s.useContent.setState({ sourceUrl: 'https://c.example.com' });
    const check = jest.spyOn(s.useContent.getState(), 'checkForUpdates').mockResolvedValue({ updated: [] });
    const stop = s.startBackgroundServices();
    jest.advanceTimersByTime(1500);
    expect(check).toHaveBeenCalledTimes(1);
    stop();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('with cloud sync on, uploads when the device comes back online', async () => {
    jest.useFakeTimers();
    const s = load(true);
    global.fetch = okFetch() as unknown as typeof fetch;
    s.useApp.getState().setupFamily('Mum');
    const stop = s.startBackgroundServices();
    await jest.advanceTimersByTimeAsync(8000);
    (global.fetch as jest.Mock).mockClear();
    s.useApp.getState().addProfile({ name: 'Adam', level: 3 });
    const listener = (Network.addNetworkStateListener as jest.Mock).mock.calls.at(-1)[0];
    listener({ isConnected: false, isInternetReachable: false });
    listener({ isConnected: true, isInternetReachable: true });
    await jest.advanceTimersByTimeAsync(8000);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    stop();
  });

  it('with cloud sync on, uploads a few seconds after a change', async () => {
    jest.useFakeTimers();
    const s = load(true);
    global.fetch = okFetch() as unknown as typeof fetch;
    s.useApp.getState().setupFamily('Mum');
    const stop = s.startBackgroundServices();
    s.useApp.getState().addProfile({ name: 'Adam', level: 3 });
    await jest.advanceTimersByTimeAsync(8000);
    expect(global.fetch).toHaveBeenCalled();
    stop();
    expect(Network.addNetworkStateListener).toHaveBeenCalled();
  });
});

