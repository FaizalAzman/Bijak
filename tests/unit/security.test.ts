import * as SecureStore from 'expo-secure-store';
import { clearParentPin, hasParentPin, secureGet, setParentPin, verifyParentPin } from '@/lib/secure';
import { afterFailure, lockDuration, lockRemaining, PIN_FIRST_LOCK_MS, PIN_GUARD_CLEAR, PIN_MAX_LOCK_MS, PIN_TRIES_PER_LOCK, usePinGuard } from '@/features/profile/pinGuard';
import { isParentUnlocked, useParentSession } from '@/features/profile/parentSession';
import { kv } from '@/lib/storage';

describe('parent PIN storage', () => {
  beforeEach(() => clearParentPin());

  it('verifies only the PIN that was set', async () => {
    expect(await hasParentPin()).toBe(false);
    expect(await verifyParentPin('1234')).toBe(false);
    await setParentPin('2468');
    expect(await hasParentPin()).toBe(true);
    expect(await verifyParentPin('2468')).toBe(true);
    for (const wrong of ['2467', '8642', '', '24680', ' 2468']) expect(await verifyParentPin(wrong)).toBe(false);
  });

  it('stores a salted hash in the keychain, never the PIN itself', async () => {
    await setParentPin('2468');
    const first = JSON.parse((await secureGet('bijak.parentPin'))!);
    expect(JSON.stringify(first)).not.toContain('2468');
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
    await setParentPin('2468');
    const second = JSON.parse((await secureGet('bijak.parentPin'))!);
    expect(second.salt).not.toBe(first.salt);
    expect(second.hash).not.toBe(first.hash);
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
  });

  it('changing the PIN invalidates the old one', async () => {
    await setParentPin('1111');
    await setParentPin('2222');
    expect(await verifyParentPin('1111')).toBe(false);
    expect(await verifyParentPin('2222')).toBe(true);
  });

  it('clearing removes the PIN', async () => {
    await setParentPin('1111');
    await clearParentPin();
    expect(await hasParentPin()).toBe(false);
  });
});

describe('PIN brute-force guard', () => {
  it('locks on every 5th failure, doubling up to 15 minutes', () => {
    expect(PIN_TRIES_PER_LOCK).toBe(5);
    expect([1, 2, 3, 4].map(lockDuration)).toEqual([0, 0, 0, 0]);
    expect(lockDuration(5)).toBe(PIN_FIRST_LOCK_MS);
    expect(lockDuration(10)).toBe(PIN_FIRST_LOCK_MS * 2);
    expect(lockDuration(15)).toBe(PIN_FIRST_LOCK_MS * 4);
    expect(lockDuration(500)).toBe(PIN_MAX_LOCK_MS);
    expect(lockDuration(0)).toBe(0);
  });

  it('afterFailure counts and sets the lock time', () => {
    let s = PIN_GUARD_CLEAR;
    for (let i = 0; i < 4; i++) s = afterFailure(s, 1000);
    expect(s).toEqual({ failures: 4, lockedUntil: 0 });
    s = afterFailure(s, 1000);
    expect(s).toEqual({ failures: 5, lockedUntil: 1000 + PIN_FIRST_LOCK_MS });
    expect(lockRemaining(s, 1000)).toBe(PIN_FIRST_LOCK_MS);
    expect(lockRemaining(s, 1000 + PIN_FIRST_LOCK_MS)).toBe(0);
    // Failing again after the lock keeps counting towards the next, longer lock.
    s = afterFailure(s, 1000 + PIN_FIRST_LOCK_MS + 1);
    expect(s.failures).toBe(6);
    expect(s.lockedUntil).toBe(1000 + PIN_FIRST_LOCK_MS);
  });

  it('is persisted, so reopening the screen or the app does not reset it', () => {
    for (let i = 0; i < 5; i++) usePinGuard.getState().fail();
    expect(lockRemaining(usePinGuard.getState(), Date.now())).toBeGreaterThan(0);
    const saved = JSON.parse(kv.getItem('bijak-pin-guard')!);
    expect(saved.state.failures).toBe(5);
    expect(saved.state.lockedUntil).toBeGreaterThan(Date.now());
    usePinGuard.getState().succeed();
    expect(usePinGuard.getState().failures).toBe(0);
    expect(JSON.parse(kv.getItem('bijak-pin-guard')!).state).toEqual({ failures: 0, lockedUntil: 0 });
  });
});

describe('parent session', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    useParentSession.getState().lock();
    jest.useRealTimers();
  });

  it('starts locked, unlocks, and locks itself after 10 minutes', () => {
    expect(isParentUnlocked()).toBe(false);
    useParentSession.getState().unlock();
    expect(isParentUnlocked()).toBe(true);
    jest.advanceTimersByTime(10 * 60_000 - 1);
    expect(isParentUnlocked()).toBe(true);
    jest.advanceTimersByTime(1);
    expect(isParentUnlocked()).toBe(false);
  });

  it('unlocking again restarts the 10-minute window', () => {
    useParentSession.getState().unlock();
    jest.advanceTimersByTime(9 * 60_000);
    useParentSession.getState().unlock();
    jest.advanceTimersByTime(9 * 60_000);
    expect(isParentUnlocked()).toBe(true);
  });

  it('lock() locks immediately and cancels the timer', () => {
    useParentSession.getState().unlock();
    useParentSession.getState().lock();
    expect(isParentUnlocked()).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });
});
