/**
 * Module 16b — Streaks that forgive real life.
 *
 * - A streak counts calendar days on which the child finished a quiz or a lesson.
 * - Rest days (set by a parent, e.g. the weekend) never break a streak; playing on one still counts.
 * - Rest-day shields cover a missed school day. One is earned every 7 streak days and they can be
 *   bought with coins; a child holds at most `SHIELD.max`. They are used automatically the next
 *   time the child plays.
 */
import { addDays } from '@/lib/date';

export const SHIELD = { price: 40, max: 2, earnEvery: 7 } as const;

/** Weekdays that don't count (0 = Sunday … 6 = Saturday). Some states rest on Friday–Saturday. */
export const REST_DAY_PRESETS = {
  none: [] as number[],
  satSun: [6, 0],
  friSat: [5, 6],
} as const;
export type RestDayPreset = keyof typeof REST_DAY_PRESETS;
export const MAX_REST_DAYS = 2;

export interface StreakState {
  current: number;
  best: number;
  lastDay: string | null;
  /** Rest-day shields waiting to be used. */
  shields?: number;
  /** Recent days a shield covered (for the streak calendar). */
  shielded?: string[];
}

/** Local weekday of a day key (noon avoids any daylight-saving edge). */
export const weekday = (day: string) => new Date(`${day}T12:00:00`).getDay();

export const isRestDay = (day: string, restDays: readonly number[]) => restDays.includes(weekday(day));

/** Keep only valid, distinct weekdays, at most `MAX_REST_DAYS` of them. */
export function cleanRestDays(days: readonly number[] | undefined): number[] {
  return [...new Set((days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].slice(0, MAX_REST_DAYS);
}

export function restDayPreset(days: readonly number[] | undefined): RestDayPreset | null {
  const key = [...cleanRestDays(days)].sort().join(',');
  for (const [name, preset] of Object.entries(REST_DAY_PRESETS)) if ([...preset].sort().join(',') === key) return name as RestDayPreset;
  return null;
}

/**
 * School days strictly between two days that the child did not play (rest days skipped).
 * Stops after `limit` days — callers only need to know whether shields can cover the gap.
 */
export function missedDays(lastDay: string, today: string, restDays: readonly number[], limit = Infinity): string[] {
  const out: string[] = [];
  for (let d = addDays(lastDay, 1); d < today && out.length < limit; d = addDays(d, 1)) if (!isRestDay(d, restDays)) out.push(d);
  return out;
}

export interface StreakAdvance {
  streak: Required<StreakState>;
  /** Days a shield was spent on. */
  shieldsUsed: string[];
  shieldEarned: boolean;
}

/** What finishing a quiz or lesson today does to the streak. */
export function advanceStreak(s: StreakState, today: string, restDays: readonly number[]): StreakAdvance {
  const shields = Math.min(SHIELD.max, Math.max(0, s.shields ?? 0));
  const shielded = s.shielded ?? [];
  // Already counted today (or the device clock went backwards): nothing changes.
  if (s.lastDay && s.lastDay >= today) return { streak: { ...s, shields, shielded }, shieldsUsed: [], shieldEarned: false };

  let current = 1;
  let used: string[] = [];
  if (s.lastDay && s.current > 0) {
    const missed = missedDays(s.lastDay, today, restDays, shields + 1);
    if (missed.length === 0) current = s.current + 1;
    else if (missed.length <= shields) {
      current = s.current + 1;
      used = missed;
    }
  }
  let left = shields - used.length;
  const shieldEarned = current % SHIELD.earnEvery === 0 && left < SHIELD.max;
  if (shieldEarned) left++;
  return {
    streak: { current, best: Math.max(s.best, current), lastDay: today, shields: left, shielded: [...shielded, ...used].slice(-30) },
    shieldsUsed: used,
    shieldEarned,
  };
}

/** The streak shown right now: still alive if every missed school day can be covered by a shield. */
export function liveStreak(s: StreakState, today: string, restDays: readonly number[] = []): number {
  if (!s.lastDay || s.current <= 0) return 0;
  if (s.lastDay >= today) return s.current;
  const shields = s.shields ?? 0;
  return missedDays(s.lastDay, today, restDays, shields + 1).length <= shields ? s.current : 0;
}

/**
 * Today's situation, for the mascot, the streak card and the "save your streak" reminder:
 * - done: already played today
 * - rest: today is a rest day (nothing is at stake)
 * - protected: not played yet, but a shield would cover today
 * - atRisk: not played yet and missing today would end the streak
 * - none: no streak to keep
 */
export type StreakStatus = 'done' | 'rest' | 'protected' | 'atRisk' | 'none';

export function streakStatus(s: StreakState, today: string, restDays: readonly number[] = []): StreakStatus {
  if (s.lastDay === today && s.current > 0) return 'done';
  const live = liveStreak(s, today, restDays);
  if (live === 0) return 'none';
  if (isRestDay(today, restDays)) return 'rest';
  const needed = s.lastDay ? missedDays(s.lastDay, today, restDays).length : 0;
  return (s.shields ?? 0) > needed ? 'protected' : 'atRisk';
}
