/**
 * Module 21 (device half): keeps the phone's scheduled notifications equal to the plan in
 * ./plan.ts, asks for permission only when a parent turns a reminder on, and opens the
 * right screen when a reminder is tapped.
 */
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { currentT } from '@/i18n';
import { telemetry } from '@/lib/telemetry';
import { useApp } from '@/store/app';
import { DEFAULT_REMINDERS, planReminders, type PlannedReminder } from './plan';

const PREFIX = 'bijak-';
const CHANNEL = 'reminders';
/** Progress changes with every answer; wait for a quiet moment before re-planning. */
export const SYNC_DELAY_MS = 1500;

/** Local notifications need the native app (not the web build). */
export const remindersSupported = () => Platform.OS !== 'web';

/** The plan for this family right now. */
export function currentPlan(now = new Date()): PlannedReminder[] {
  const s = useApp.getState();
  return planReminders({
    now,
    reminders: s.settings.reminders ?? DEFAULT_REMINDERS,
    restDays: s.settings.restDays ?? [],
    children: s.profiles.filter((p) => s.progress[p.id]).map((p) => ({ name: p.name, streak: s.progress[p.id].streak })),
    lang: s.settings.uiLang,
  });
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  const t = currentT();
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: t('settings.reminders'),
    description: t('rem.channel'),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Ask for permission (only ever from a parent's tap). True when reminders can be shown. */
export async function allowNotifications(): Promise<boolean> {
  if (!remindersSupported()) return false;
  try {
    // Android 13+ only offers the permission prompt once a channel exists.
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch (e) {
    telemetry.error(e, { where: 'reminders-permission' });
    return false;
  }
}

let synced = '';
let running: Promise<void> | null = null;
let again = false;

async function syncOnce() {
  const plan = currentPlan();
  const key = JSON.stringify(plan);
  if (key === synced) return;
  const { granted } = await Notifications.getPermissionsAsync();
  const wanted = granted ? plan : [];
  await ensureChannel();
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of existing) if (n.identifier.startsWith(PREFIX)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
  for (const r of wanted) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, data: { url: r.url } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
    });
  }
  // Without permission, try again next time (the parent may allow it in the phone's settings).
  synced = granted ? key : '';
}

/** Make the phone's scheduled reminders match the plan. Calls made while one runs are merged. */
export function syncReminders(): Promise<void> {
  if (!remindersSupported()) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      try {
        await syncOnce();
      } catch (e) {
        synced = '';
        telemetry.error(e, { where: 'reminders' });
      }
    } while (again);
    running = null;
  })();
  return running;
}

/** Forget what was last scheduled (tests, or after the phone's notification settings change). */
export function resetReminderSync() {
  synced = '';
}

/** Only paths inside the app, e.g. "/" or "/parent?next=report". */
export const isAppPath = (url: unknown): url is string => typeof url === 'string' && /^\/(?!\/)[\w\-/?=&]*$/.test(url);

/**
 * Keep reminders in step with the family's progress and open the right screen when one is
 * tapped (also when the tap launched the app). Returns a cleanup function.
 */
export function startReminders(open: (url: string) => void): () => void {
  if (!remindersSupported()) return () => undefined;
  // A reminder is pointless while Bijak is on screen (and would cover a quiz).
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
  });
  const onTap = (response: Notifications.NotificationResponse | null) => {
    const url = response?.notification.request.content.data?.url;
    if (isAppPath(url)) open(url);
  };
  const launchedBy = Notifications.getLastNotificationResponse();
  if (launchedBy) {
    onTap(launchedBy);
    Notifications.clearLastNotificationResponse();
  }
  const taps = Notifications.addNotificationResponseReceivedListener(onTap);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void syncReminders(), SYNC_DELAY_MS);
  };
  const unsubscribe = useApp.subscribe((s, prev) => {
    if (s.settings !== prev.settings || s.progress !== prev.progress || s.profiles !== prev.profiles) later();
  });
  // Coming back to the app (e.g. the next day) re-plans from the new "now".
  const appState = AppState.addEventListener('change', (state) => state === 'active' && later());
  void syncReminders();
  return () => {
    clearTimeout(timer);
    taps.remove();
    unsubscribe();
    appState.remove();
  };
}
