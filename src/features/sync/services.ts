/**
 * Module 2 (cloud half) + Module 3 (background delivery).
 *
 * - Cloud sync: when a Supabase project is configured (EXPO_PUBLIC_SUPABASE_URL +
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY), each child's progress snapshot is upserted whenever
 *   the device is online and something changed. Rows are isolated per family by a random
 *   family key kept in SecureStore (see docs/supabase.sql for the RLS policy).
 * - Content: checks the remote syllabus manifest shortly after launch.
 * - Expo Updates: downloads OTA JS/asset updates in the background (applied next launch).
 */
import * as Crypto from 'expo-crypto';
import * as Network from 'expo-network';
import * as Updates from 'expo-updates';
import { useContent } from '@/features/content/registry';
import { secureGet, secureSet } from '@/lib/secure';
import { telemetry } from '@/lib/telemetry';
import { useApp } from '@/store/app';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const FAMILY_KEY = 'bijak.familyKey';

export const cloudSyncConfigured = () => !!SUPABASE_URL && !!SUPABASE_KEY;

async function familyKey(): Promise<string> {
  let k = await secureGet(FAMILY_KEY);
  if (!k) {
    k = `${Crypto.randomUUID()}${Crypto.randomUUID()}`.replace(/-/g, '');
    await secureSet(FAMILY_KEY, k);
  }
  return k;
}

let syncing = false;

export async function syncNow(): Promise<{ ok: boolean; message: string }> {
  if (!cloudSyncConfigured()) return { ok: false, message: 'Cloud sync is not configured' };
  const { parent, profiles, progress, dirtyAt, syncedAt, markSynced } = useApp.getState();
  if (!parent) return { ok: false, message: 'No family yet' };
  if (syncedAt && syncedAt >= dirtyAt) return { ok: true, message: 'Already up to date' };
  if (syncing) return { ok: false, message: 'Sync in progress' };
  syncing = true;
  try {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected || state.isInternetReachable === false) return { ok: false, message: 'Offline — will sync later' };
    const key = await familyKey();
    const rows = profiles.map((p) => ({
      family_id: parent.familyId,
      family_key: key,
      profile_id: p.id,
      name: p.name,
      level: p.level,
      avatar: p.avatar,
      progress: progress[p.id],
      updated_at: new Date().toISOString(),
    }));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bijak_progress?on_conflict=profile_id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
        'x-family-key': key,
      },
      body: JSON.stringify(rows),
    });
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const at = Date.now();
    markSynced(at);
    telemetry.event('sync_ok', { profiles: rows.length });
    return { ok: true, message: 'Synced' };
  } catch (e) {
    telemetry.event('sync_failed', { error: e instanceof Error ? e.message : String(e) });
    return { ok: false, message: e instanceof Error ? e.message : 'Sync failed' };
  } finally {
    syncing = false;
  }
}

export async function checkOtaUpdate(): Promise<'none' | 'downloaded' | 'disabled'> {
  if (!Updates.isEnabled || __DEV__) return 'disabled';
  try {
    const res = await Updates.checkForUpdateAsync();
    if (!res.isAvailable) return 'none';
    await Updates.fetchUpdateAsync();
    telemetry.event('ota_downloaded');
    return 'downloaded';
  } catch (e) {
    telemetry.event('ota_failed', { error: e instanceof Error ? e.message : String(e) });
    return 'none';
  }
}

export function startBackgroundServices(): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  timers.push(
    setTimeout(() => {
      if (useContent.getState().sourceUrl) useContent.getState().checkForUpdates();
      checkOtaUpdate();
    }, 1500),
  );

  if (!cloudSyncConfigured()) return () => timers.forEach(clearTimeout);

  let debounce: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void syncNow(), 8000);
  };
  const unsubStore = useApp.subscribe((s, prev) => {
    if (s.dirtyAt !== prev.dirtyAt) schedule();
  });
  const netSub = Network.addNetworkStateListener((st) => {
    if (st.isConnected && st.isInternetReachable !== false) schedule();
  });
  schedule();
  return () => {
    timers.forEach(clearTimeout);
    if (debounce) clearTimeout(debounce);
    unsubStore();
    netSub.remove();
  };
}
