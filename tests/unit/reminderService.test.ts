/**
 * The device side of reminders: the phone's schedule always equals the plan, permission is
 * only asked for on a parent's tap, and tapping a reminder opens the right screen.
 */
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { allowNotifications, currentPlan, isAppPath, remindersSupported, resetReminderSync, startReminders, SYNC_DELAY_MS, syncReminders } from '@/features/reminders/service';
import { telemetry } from '@/lib/telemetry';
import { useApp } from '@/store/app';
import { advance, playQuiz, resetStores, setNow, setupChild } from '../helpers';

const N = Notifications as unknown as typeof Notifications & { __scheduled: { identifier: string; content: { data: { url: string } }; trigger: { type: string; date: Date; channelId: string } }[] };
const scheduledIds = () => N.__scheduled.map((n) => n.identifier).sort();
const permission = (granted: boolean, canAskAgain = true) => ({ granted, canAskAgain, status: granted ? 'granted' : 'denied', expires: 'never' }) as never;
const s = () => useApp.getState();

beforeEach(() => {
  setNow('2026-03-02T09:00:00');
  resetStores();
  N.__scheduled.length = 0;
  resetReminderSync();
  jest.clearAllMocks();
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue(permission(true));
  setupChild({ name: 'Adam' });
});
afterEach(() => jest.useRealTimers());

describe('syncReminders', () => {
  it('schedules exactly the plan, as one-off date reminders that open the app', async () => {
    s().updateSettings({ reminders: { daily: true, weekly: true } });
    await syncReminders();
    const plan = currentPlan();
    expect(scheduledIds()).toEqual(plan.map((r) => r.id).sort());
    expect(plan).toHaveLength(8);
    const first = N.__scheduled.find((n) => n.identifier === 'bijak-daily-2026-03-02')!;
    expect(first.trigger).toEqual({ type: 'date', date: new Date('2026-03-02T17:00:00'), channelId: 'reminders' });
    expect(first.content).toEqual({ title: 'Time for Bijak 📚', body: 'Adam’s quests are ready. Ten minutes is plenty!', data: { url: '/' } });
    expect(N.__scheduled.find((n) => n.identifier === 'bijak-weekly-2026-03-08')!.content.data.url).toBe('/parent?next=report');
  });

  it('does no work when nothing changed, and re-plans when a child plays', async () => {
    s().updateSettings({ reminders: { daily: true } });
    await syncReminders();
    jest.clearAllMocks();
    await syncReminders();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    playQuiz('s3-sci-rules-q1');
    await syncReminders();
    expect(scheduledIds()).not.toContain('bijak-daily-2026-03-02');
    expect(scheduledIds()).toHaveLength(6);
  });

  it('turning reminders off clears them, leaving other apps’ notifications alone', async () => {
    N.__scheduled.push({ identifier: 'someone-else', content: { data: { url: '/' } }, trigger: { type: 'date', date: new Date(), channelId: 'x' } });
    s().updateSettings({ reminders: { daily: true } });
    await syncReminders();
    s().updateSettings({ reminders: { daily: false } });
    await syncReminders();
    expect(scheduledIds()).toEqual(['someone-else']);
  });

  it('without permission nothing is scheduled (and it checks again next time)', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue(permission(false));
    s().updateSettings({ reminders: { daily: true } });
    await syncReminders();
    await syncReminders();
    expect(scheduledIds()).toEqual([]);
    expect(Notifications.getPermissionsAsync).toHaveBeenCalledTimes(2);
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue(permission(true));
    await syncReminders();
    expect(scheduledIds()).toHaveLength(7);
  });

  it('calls made while a sync runs are merged into one follow-up', async () => {
    s().updateSettings({ reminders: { daily: true } });
    const a = syncReminders();
    const b = syncReminders();
    expect(b).toBe(a);
    await a;
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(7);
  });

  it('a failure is reported and retried on the next sync', async () => {
    const error = jest.spyOn(telemetry, 'error').mockImplementation(() => undefined);
    (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValueOnce(new Error('OS said no'));
    s().updateSettings({ reminders: { daily: true } });
    await syncReminders();
    expect(error).toHaveBeenCalledWith(expect.any(Error), { where: 'reminders' });
    await syncReminders();
    expect(scheduledIds()).toHaveLength(7);
    error.mockRestore();
  });

  it('Android gets a “Reminders” channel', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    s().updateSettings({ reminders: { daily: true } });
    await syncReminders();
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('reminders', expect.objectContaining({ name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT }));
    jest.restoreAllMocks();
  });

  it('is a no-op in the web build', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    s().updateSettings({ reminders: { daily: true } });
    expect(remindersSupported()).toBe(false);
    await syncReminders();
    expect(await allowNotifications()).toBe(false);
    const stop = startReminders(jest.fn());
    stop();
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.setNotificationHandler).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});

describe('allowNotifications', () => {
  it('is true straight away when already allowed', async () => {
    expect(await allowNotifications()).toBe(true);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('asks the phone when it may, and reports the answer', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue(permission(false));
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce(permission(true)).mockResolvedValueOnce(permission(false));
    expect(await allowNotifications()).toBe(true);
    expect(await allowNotifications()).toBe(false);
  });

  it('does not ask again once the parent said no in the phone’s settings', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue(permission(false, false));
    expect(await allowNotifications()).toBe(false);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('treats an error as “not allowed” and reports it', async () => {
    const error = jest.spyOn(telemetry, 'error').mockImplementation(() => undefined);
    (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    expect(await allowNotifications()).toBe(false);
    expect(error).toHaveBeenCalledWith(expect.any(Error), { where: 'reminders-permission' });
    error.mockRestore();
  });
});

describe('startReminders', () => {
  const response = (url: unknown) => ({ notification: { request: { content: { data: { url } } } } }) as never;

  it('never shows a reminder while Bijak is open', async () => {
    const stop = startReminders(jest.fn());
    const { handleNotification } = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0][0];
    await expect(handleNotification()).resolves.toEqual({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false });
    stop();
  });

  it('opens the screen of the reminder that launched the app, once', () => {
    (Notifications.getLastNotificationResponse as jest.Mock).mockReturnValueOnce(response('/parent?next=report'));
    const open = jest.fn();
    startReminders(open)();
    expect(open).toHaveBeenCalledWith('/parent?next=report');
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();
  });

  it('opens tapped reminders, but only paths inside the app', () => {
    const open = jest.fn();
    const stop = startReminders(open);
    const tap = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.calls[0][0];
    tap(response('/'));
    tap(response('https://example.com'));
    tap(response('//example.com'));
    tap(response(42));
    tap(null);
    expect(open.mock.calls).toEqual([['/']]);
    stop();
    expect((Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.results[0].value.remove).toHaveBeenCalled();
  });

  it('re-plans shortly after progress or settings change, and when the app comes back', async () => {
    let onAppState: (state: string) => void = () => undefined;
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
      onAppState = fn as (state: string) => void;
      return { remove } as never;
    });
    const stop = startReminders(jest.fn());
    await Promise.resolve();
    s().updateSettings({ reminders: { daily: true } });
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    await jestAdvance(SYNC_DELAY_MS);
    expect(scheduledIds()).toHaveLength(7);

    // The next morning the app is opened again: yesterday's reminder is gone from the plan.
    advance(24 * 3600_000);
    onAppState('background');
    onAppState('active');
    await jestAdvance(SYNC_DELAY_MS);
    expect(scheduledIds()[0]).toBe('bijak-daily-2026-03-03');

    stop();
    expect(remove).toHaveBeenCalled();
    s().updateSettings({ reminders: { weekly: true } });
    await jestAdvance(SYNC_DELAY_MS);
    expect(scheduledIds().some((id) => id.startsWith('bijak-weekly'))).toBe(false);
    jest.restoreAllMocks();
  });
});

it('isAppPath accepts only in-app paths', () => {
  expect(['/', '/parent/report', '/parent?next=report', '/topic/s3-math-money'].every(isAppPath)).toBe(true);
  expect(['', 'parent', '//evil.com', 'https://evil.com', '/a b', '/x#y', undefined, 5].some(isAppPath)).toBe(false);
});

async function jestAdvance(ms: number) {
  jest.advanceTimersByTime(ms);
  for (let i = 0; i < 20; i++) await Promise.resolve();
}
