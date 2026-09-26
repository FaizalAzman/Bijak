/**
 * Brute-force protection for the parent PIN. Failures are persisted, so closing the PIN
 * screen (or restarting the app) doesn't reset the count. Every 5th wrong PIN locks the
 * keypad; each lock doubles (30 s, 1 min, 2 min … capped at 15 min). A correct PIN resets it.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { kv } from '@/lib/storage';

export const PIN_TRIES_PER_LOCK = 5;
export const PIN_FIRST_LOCK_MS = 30_000;
export const PIN_MAX_LOCK_MS = 15 * 60_000;

export interface PinGuardState {
  failures: number;
  lockedUntil: number;
}

export const PIN_GUARD_CLEAR: PinGuardState = { failures: 0, lockedUntil: 0 };

export function lockDuration(failures: number): number {
  if (failures <= 0 || failures % PIN_TRIES_PER_LOCK !== 0) return 0;
  const round = failures / PIN_TRIES_PER_LOCK;
  return Math.min(PIN_MAX_LOCK_MS, PIN_FIRST_LOCK_MS * 2 ** (round - 1));
}

export function afterFailure(s: PinGuardState, now: number): PinGuardState {
  const failures = s.failures + 1;
  const lock = lockDuration(failures);
  return { failures, lockedUntil: lock ? now + lock : s.lockedUntil };
}

/** Milliseconds until the keypad unlocks (0 when usable). */
export function lockRemaining(s: PinGuardState, now: number): number {
  return Math.max(0, s.lockedUntil - now);
}

export const usePinGuard = create<PinGuardState & { fail: () => void; succeed: () => void }>()(
  persist(
    (set, get) => ({
      ...PIN_GUARD_CLEAR,
      fail: () => set(afterFailure(get(), Date.now())),
      succeed: () => set(PIN_GUARD_CLEAR),
    }),
    { name: 'bijak-pin-guard', storage: createJSONStorage(() => kv), partialize: (s) => ({ failures: s.failures, lockedUntil: s.lockedUntil }) },
  ),
);
