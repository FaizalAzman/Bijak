import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import ParentGate from '@/app/parent/index';
import ParentSettings from '@/app/parent/settings';
import * as Toaster from '@/components/gamify/Toaster';
import { isParentUnlocked, useParentSession } from '@/features/profile/parentSession';
import { PIN_FIRST_LOCK_MS, usePinGuard } from '@/features/profile/pinGuard';
import { setParentPin, verifyParentPin } from '@/lib/secure';
import { resetStores, setNow } from '../helpers';

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
