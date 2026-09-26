import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import ParentGate from '@/app/parent/index';
import ParentSettings from '@/app/parent/settings';
import * as Toaster from '@/components/gamify/Toaster';
import { isParentUnlocked, useParentSession } from '@/features/profile/parentSession';
import { PIN_FIRST_LOCK_MS, usePinGuard } from '@/features/profile/pinGuard';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { refreshVoices } from '@/lib/feedback';
import { setParentPin, verifyParentPin } from '@/lib/secure';
import { useApp } from '@/store/app';
import { resetStores, setNow } from '../helpers';
import { ANDROID, IOS } from '../voices';

const key = (d: string) => fireEvent.press(screen.getByRole('button', { name: d }));
async function typePin(pin: string) {
  for (const d of pin) await key(d);
  // The PIN is checked asynchronously (hashing), then the dots clear after a moment.
  await act(async () => {
    await Promise.resolve();
    jest.advanceTimersByTime(450);
  });
}

beforeEach(async () => {
  setNow('2026-03-02T20:00:00');
  resetStores();
  await setParentPin('1357');
  usePinGuard.getState().succeed();
  useParentSession.getState().lock();
  jest.clearAllMocks();
});
afterEach(() => {
  useParentSession.getState().lock();
  jest.useRealTimers();
});

describe('PIN gate', () => {
  it('opens the dashboard with the right PIN', async () => {
    await render(<ParentGate />);
    await typePin('1357');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/parent/dashboard'));
    expect(isParentUnlocked()).toBe(true);
  });

  it('goes to “add a learner” when that is where the parent was heading', async () => {
    (globalThis as { __routeParams?: object }).__routeParams = { next: 'add-child' };
    await render(<ParentGate />);
    await typePin('1357');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/onboarding'));
  });

  it('goes to the weekly report when its reminder was tapped', async () => {
    (globalThis as { __routeParams?: object }).__routeParams = { next: 'report' };
    await render(<ParentGate />);
    await typePin('1357');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/parent/report'));
    (globalThis as { __routeParams?: object }).__routeParams = {};
  });

  it('says so on a wrong PIN and stays locked', async () => {
    await render(<ParentGate />);
    await typePin('0000');
    expect(screen.getByText('Wrong PIN, try again.')).toBeOnTheScreen();
    expect(isParentUnlocked()).toBe(false);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('locks the keypad after 5 wrong PINs — and reopening the screen does not reset it', async () => {
    const first = await render(<ParentGate />);
    for (let i = 0; i < 5; i++) await typePin('0000');
    expect(screen.getByTestId('pin-locked')).toHaveTextContent('Too many tries. Wait 30 seconds.');
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled();
    await first.unmount();

    await render(<ParentGate />);
    expect(screen.getByTestId('pin-locked')).toBeOnTheScreen();
    await typePin('1357');
    expect(isParentUnlocked()).toBe(false);

    await act(async () => jest.advanceTimersByTime(PIN_FIRST_LOCK_MS));
    expect(screen.queryByTestId('pin-locked')).toBeNull();
    await typePin('1357');
    await waitFor(() => expect(isParentUnlocked()).toBe(true));
    expect(usePinGuard.getState().failures).toBe(0);
  });

  it('the countdown shows the time left', async () => {
    for (let i = 0; i < 5; i++) usePinGuard.getState().fail();
    await render(<ParentGate />);
    await act(async () => jest.advanceTimersByTime(10_000));
    expect(screen.getByTestId('pin-locked')).toHaveTextContent(/Wait 20 seconds\./);
  });

  it('skips the PIN while the parent session is still open', async () => {
    useParentSession.getState().unlock();
    await render(<ParentGate />);
    expect(router.replace).toHaveBeenCalledWith('/parent/dashboard');
  });
});

describe('change PIN', () => {
  let toast: jest.SpyInstance;
  beforeEach(() => {
    toast = jest.spyOn(Toaster, 'toast').mockImplementation(() => undefined);
    useParentSession.getState().unlock();
  });
  afterEach(() => toast.mockRestore());

  it('asks for the new PIN twice and only saves a match', async () => {
    await render(<ParentSettings />);
    await fireEvent.press(screen.getByTestId('change-pin'));
    expect(screen.getByText('Enter a new 4-digit PIN')).toBeOnTheScreen();
    await typePin('2468');
    expect(screen.getByText('Type the new PIN again')).toBeOnTheScreen();
    await typePin('2469');
    expect(screen.getByTestId('pin-mismatch')).toBeOnTheScreen();
    expect(await verifyParentPin('1357')).toBe(true);
    await typePin('2468');
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'PIN updated' })));
    expect(await verifyParentPin('2468')).toBe(true);
    expect(await verifyParentPin('1357')).toBe(false);
    expect(screen.getByTestId('change-pin')).toBeOnTheScreen();
  });

  it('the app language can be changed here too, for the whole family', async () => {
    const { useApp } = require('@/store/app');
    await render(<ParentSettings />);
    expect(screen.getByText('App language')).toBeOnTheScreen();
    expect(screen.getByText(/Lessons follow each child’s school language/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Bahasa Melayu' }));
    expect(useApp.getState().settings.uiLang).toBe('ms');
    expect(screen.getByText('Bahasa aplikasi')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Kunci zon ibu bapa' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sabtu & Ahad' })).toBeOnTheScreen();
  });

  it('rest days are chosen from the weekend presets', async () => {
    const { useApp } = require('@/store/app');
    await render(<ParentSettings />);
    expect(screen.getByRole('button', { name: 'None' })).toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: 'Fri & Sat' }));
    expect(useApp.getState().settings.restDays).toEqual([5, 6]);
    expect(screen.getByRole('button', { name: 'Fri & Sat' })).toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: 'Sat & Sun' }));
    expect(useApp.getState().settings.restDays).toEqual([6, 0]);
  });

  it('cancel keeps the old PIN', async () => {
    await render(<ParentSettings />);
    await fireEvent.press(screen.getByTestId('change-pin'));
    await typePin('2468');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(await verifyParentPin('1357')).toBe(true);
  });

  it('“Lock parent zone” locks immediately', async () => {
    await render(<ParentSettings />);
    await fireEvent.press(screen.getByRole('button', { name: 'Lock parent zone' }));
    expect(isParentUnlocked()).toBe(false);
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('bounces to the PIN gate when the session is locked', async () => {
    useParentSession.getState().lock();
    await render(<ParentSettings />);
    expect(router.replace).toHaveBeenCalledWith('/parent');
    expect(screen.queryByText('Parent PIN')).toBeNull();
  });
});

describe('read-aloud voice', () => {
  const voiceList = Speech.getAvailableVoicesAsync as jest.Mock;
  const preview = () => (Speech.speak as jest.Mock).mock.calls.map(([text, opts]) => [text, opts.voice]);
  const withVoices = async (list: typeof IOS) => {
    voiceList.mockResolvedValue(list);
    await refreshVoices();
  };

  beforeEach(() => useParentSession.getState().unlock());
  afterEach(() => voiceList.mockResolvedValue([]));

  it('lists the best voices per language; tapping one saves it and plays a sample', async () => {
    await withVoices(IOS);
    await render(<ParentSettings />);
    const english = within(screen.getByTestId('voices-en'));
    expect(english.getByRole('button', { name: 'Automatic (best)' })).toBeSelected();
    const chips = english.getAllByRole('button');
    ['Automatic (best)', 'Malcolm · British English (premium)', 'Daniel · British English (enhanced)', 'Martha · British English', 'Daniel · British English'].forEach((name, i) =>
      expect(chips[i]).toHaveAccessibleName(name),
    );
    expect(chips).toHaveLength(5);
    await fireEvent.press(english.getByRole('button', { name: 'Daniel · British English (enhanced)' }));
    expect(useApp.getState().settings.voices).toEqual({ en: 'com.apple.voice.enhanced.en-GB.Daniel' });
    expect(english.getByRole('button', { name: 'Daniel · British English (enhanced)' })).toBeSelected();
    expect(preview()).toEqual([['Hello! Let’s learn together. What is 7 times 8?', 'com.apple.voice.enhanced.en-GB.Daniel']]);

    await fireEvent.press(english.getByRole('button', { name: 'Automatic (best)' }));
    expect(useApp.getState().settings.voices).toEqual({});
    expect(preview()[1]).toEqual(['Hello! Let’s learn together. What is 7 times 8?', 'com.apple.voice.premium.en-GB.Malcolm']);
  });

  it('a voice picked earlier stays listed even outside the top few', async () => {
    await withVoices(IOS);
    useApp.getState().updateSettings({ voices: { en: 'com.apple.speech.synthesis.voice.Fred' } });
    await render(<ParentSettings />);
    expect(within(screen.getByTestId('voices-en')).getByRole('button', { name: 'Fred · American English' })).toBeSelected();
  });

  it('explains the Indonesian stand-in when the device has no Malay voice', async () => {
    await withVoices(IOS);
    const view = await render(<ParentSettings />);
    const malay = within(screen.getByTestId('voices-ms'));
    expect(malay.getByTestId('ms-stand-in')).toBeOnTheScreen();
    await fireEvent.press(malay.getByRole('button', { name: 'Damayanti · Bahasa Indonesia' }));
    expect(useApp.getState().settings.voices).toEqual({ ms: 'com.apple.voice.compact.id-ID.Damayanti' });
    expect(preview()).toEqual([['Hai! Mari belajar bersama-sama. Berapakah 7 darab 8?', 'com.apple.voice.compact.id-ID.Damayanti']]);
    await view.unmount();

    await withVoices(ANDROID);
    await render(<ParentSettings />);
    expect(screen.queryByTestId('ms-stand-in')).toBeNull();
    expect(within(screen.getByTestId('voices-ms')).getByRole('button', { name: 'Bahasa Melayu · mfm (enhanced)' })).toBeOnTheScreen();
    expect(within(screen.getByTestId('voices-ms')).queryByRole('button', { name: /needs internet/ })).toBeNull();
  });

  it('says so when the device has no voices, and finds new ones on refresh', async () => {
    await withVoices([]);
    await render(<ParentSettings />);
    expect(screen.getByText('No English voice on this device yet. Bijak will use the system default.')).toBeOnTheScreen();
    voiceList.mockResolvedValue(ANDROID);
    await fireEvent.press(screen.getByRole('button', { name: 'Refresh voices' }));
    await act(async () => undefined);
    expect(within(screen.getByTestId('voices-en')).getByRole('button', { name: 'British English · gba (enhanced)' })).toBeOnTheScreen();
  });

  it('shows that it is still looking while the device lists its voices', async () => {
    voiceList.mockReturnValue(new Promise(() => undefined));
    void refreshVoices();
    const view = await render(<ParentSettings />);
    expect(screen.getAllByText('Looking for voices…')).toHaveLength(2);
    await view.unmount();
  });
});

describe('reminders', () => {
  const permission = (granted: boolean, canAskAgain = true) => ({ granted, canAskAgain, status: granted ? 'granted' : 'denied', expires: 'never' });
  const reminders = () => useApp.getState().settings.reminders;
  const toggle = (name: string) => fireEvent.press(screen.getByRole('switch', { name }));

  beforeEach(() => {
    useParentSession.getState().unlock();
    const { setupChild } = require('../helpers');
    setupChild({ name: 'Adam' });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue(permission(false));
  });
  afterEach(() => (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue(permission(false)));

  it('are all off at first; turning one on asks the phone first, then saves it', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce(permission(true));
    await render(<ParentSettings />);
    for (const name of ['Daily reminder', 'Save-the-streak nudge', 'Weekly report']) expect(screen.getByRole('switch', { name })).not.toBeChecked();
    expect(screen.queryByTestId('next-reminder')).toBeNull();
    await toggle('Daily reminder');
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(reminders()).toMatchObject({ daily: true, time: '17:00' });
    expect(screen.getByRole('switch', { name: 'Daily reminder' })).toBeChecked();
    expect(screen.getByTestId('next-reminder')).toHaveTextContent(/^Next: .*5:00.*pm · Time for Bijak 📚$/i);
  });

  it('the time can be changed, and switches turn off without asking', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue(permission(true));
    await render(<ParentSettings />);
    await toggle('Daily reminder');
    await fireEvent.press(screen.getByRole('button', { name: '7:00 pm' }));
    expect(reminders()?.time).toBe('19:00');
    expect(screen.getByRole('button', { name: '7:00 pm' })).toBeSelected();
    await toggle('Weekly report');
    await toggle('Save-the-streak nudge');
    expect(reminders()).toEqual({ daily: true, time: '19:00', streak: true, weekly: true });
    jest.clearAllMocks();
    await toggle('Daily reminder');
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(reminders()?.daily).toBe(false);
    expect(screen.queryByRole('button', { name: '7:00 pm' })).toBeNull();
  });

  it('if the phone blocks notifications, says how to allow them and saves nothing', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue(permission(false, false));
    await render(<ParentSettings />);
    await toggle('Weekly report');
    expect(screen.getByTestId('notifications-blocked')).toHaveTextContent('Notifications are turned off for Bijak. Allow them in your phone’s Settings, then try again.');
    expect(reminders()?.weekly).toBe(false);
    expect(screen.getByRole('switch', { name: 'Weekly report' })).not.toBeChecked();
  });

  it('explains that reminders need the phone app on the web build', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await render(<ParentSettings />);
    expect(screen.getByText('Reminders work in the Bijak app on a phone or tablet.')).toBeOnTheScreen();
    expect(screen.queryByRole('switch', { name: 'Daily reminder' })).toBeNull();
    jest.restoreAllMocks();
  });
});
