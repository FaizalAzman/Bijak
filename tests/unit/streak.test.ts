import {
  advanceStreak,
  cleanRestDays,
  isRestDay,
  liveStreak,
  MAX_REST_DAYS,
  missedDays,
  REST_DAY_PRESETS,
  restDayPreset,
  SHIELD,
  streakStatus,
  weekday,
  type StreakState,
} from '@/features/gamify/streak';
import { addDays } from '@/lib/date';

// 2026-03-02 is a Monday.
const MON = '2026-03-02';
const FRI = '2026-03-06';
const SAT = '2026-03-07';
const SUN = '2026-03-08';
const NEXT_MON = '2026-03-09';
const WEEKEND = [...REST_DAY_PRESETS.satSun];
const s = (over: Partial<StreakState>): StreakState => ({ current: 3, best: 3, lastDay: MON, shields: 0, shielded: [], ...over });

describe('rest days', () => {
  it('knows the weekday of a day key', () => {
    expect([MON, FRI, SAT, SUN].map(weekday)).toEqual([1, 5, 6, 0]);
    expect(isRestDay(SAT, WEEKEND)).toBe(true);
    expect(isRestDay(FRI, WEEKEND)).toBe(false);
    expect(isRestDay(FRI, [...REST_DAY_PRESETS.friSat])).toBe(true);
  });

  it('cleans parent input: whole weekdays only, no duplicates, at most two', () => {
    expect(cleanRestDays([6, 0, 6, 9, -1, 2.5])).toEqual([6, 0]);
    expect(cleanRestDays([1, 2, 3])).toHaveLength(MAX_REST_DAYS);
    expect(cleanRestDays(undefined)).toEqual([]);
  });

  it('recognises the presets in any order', () => {
    expect(restDayPreset([0, 6])).toBe('satSun');
    expect(restDayPreset([6, 5])).toBe('friSat');
    expect(restDayPreset([])).toBe('none');
    expect(restDayPreset([2])).toBeNull();
  });

  it('missedDays lists school days strictly between two days', () => {
    expect(missedDays(MON, '2026-03-05', [])).toEqual(['2026-03-03', '2026-03-04']);
    expect(missedDays(FRI, NEXT_MON, WEEKEND)).toEqual([]);
    expect(missedDays(FRI, '2026-03-10', WEEKEND)).toEqual([NEXT_MON]);
    expect(missedDays(MON, '2026-12-31', [], 3)).toHaveLength(3);
    expect(missedDays(MON, MON, [])).toEqual([]);
  });
});

describe('advanceStreak', () => {
  it('grows on the next day and only once per day', () => {
    const a = advanceStreak(s({}), addDays(MON, 1), []);
    expect(a.streak).toMatchObject({ current: 4, best: 4, lastDay: '2026-03-03' });
    expect(advanceStreak(a.streak, '2026-03-03', []).streak).toEqual(a.streak);
  });

  it('starts at 1 for a first activity or after a long break', () => {
    expect(advanceStreak({ current: 0, best: 0, lastDay: null }, MON, []).streak).toMatchObject({ current: 1, best: 1 });
    expect(advanceStreak(s({ best: 9 }), '2026-03-20', []).streak).toMatchObject({ current: 1, best: 9 });
  });

  it('rest days never break a streak, and playing on one still counts', () => {
    expect(advanceStreak(s({ lastDay: FRI }), NEXT_MON, WEEKEND).streak.current).toBe(4);
    expect(advanceStreak(s({ lastDay: FRI }), SAT, WEEKEND).streak.current).toBe(4);
    expect(advanceStreak(s({ lastDay: FRI }), NEXT_MON, []).streak.current).toBe(1);
  });

  it('shields cover missed school days automatically and are spent', () => {
    const one = advanceStreak(s({ lastDay: MON, shields: 1 }), '2026-03-04', []);
    expect(one.streak).toMatchObject({ current: 4, shields: 0, shielded: ['2026-03-03'] });
    expect(one.shieldsUsed).toEqual(['2026-03-03']);
    const two = advanceStreak(s({ lastDay: MON, shields: 2 }), '2026-03-05', []);
    expect(two.streak).toMatchObject({ current: 4, shields: 0 });
    expect(two.shieldsUsed).toHaveLength(2);
  });

  it('does not waste shields on a streak they cannot save', () => {
    const r = advanceStreak(s({ lastDay: MON, shields: 2 }), '2026-03-06', []);
    expect(r.streak).toMatchObject({ current: 1, shields: 2 });
    expect(r.shieldsUsed).toEqual([]);
  });

  it(`earns a shield every ${SHIELD.earnEvery} streak days, up to ${SHIELD.max}`, () => {
    let st: StreakState = { current: 0, best: 0, lastDay: null };
    const earnedOn: number[] = [];
    for (let d = 0; d < 28; d++) {
      const r = advanceStreak(st, addDays(MON, d), []);
      if (r.shieldEarned) earnedOn.push(r.streak.current);
      st = r.streak;
    }
    expect(earnedOn).toEqual([7, 14]);
    expect(st.shields).toBe(SHIELD.max);
  });

  it('keeps the last 30 shielded days and never holds more than the maximum', () => {
    const r = advanceStreak(s({ shields: 99, shielded: Array.from({ length: 40 }, (_, i) => addDays('2026-01-01', i)) }), addDays(MON, 1), []);
    expect(r.streak.shields).toBe(SHIELD.max);
    expect(r.streak.shielded).toHaveLength(30);
  });

  it('a clock moved backwards changes nothing', () => {
    expect(advanceStreak(s({ lastDay: FRI }), MON, []).streak).toMatchObject({ current: 3, lastDay: FRI });
  });
});

describe('liveStreak and streakStatus', () => {
  it('shows the streak through yesterday, and to 0 after an uncovered school day', () => {
    expect(liveStreak(s({}), MON)).toBe(3);
    expect(liveStreak(s({}), '2026-03-03')).toBe(3);
    expect(liveStreak(s({}), '2026-03-04')).toBe(0);
    expect(liveStreak({ current: 0, best: 0, lastDay: null }, MON)).toBe(0);
  });

  it('stays alive while shields or rest days cover the gap', () => {
    expect(liveStreak(s({ shields: 1 }), '2026-03-04')).toBe(3);
    expect(liveStreak(s({ lastDay: FRI }), NEXT_MON, WEEKEND)).toBe(3);
    expect(liveStreak(s({ lastDay: FRI }), '2026-03-10', WEEKEND)).toBe(0);
  });

  it.each([
    ['done', s({ lastDay: MON }), MON, []],
    ['atRisk', s({ lastDay: MON }), '2026-03-03', []],
    ['protected', s({ lastDay: MON, shields: 1 }), '2026-03-03', []],
    ['atRisk', s({ lastDay: MON, shields: 1 }), '2026-03-04', []],
    ['rest', s({ lastDay: FRI }), SAT, WEEKEND],
    ['none', s({ lastDay: MON }), '2026-03-10', []],
    ['none', { current: 0, best: 0, lastDay: null }, MON, []],
  ] as const)('%s', (expected, state, today, rest) => {
    expect(streakStatus(state, today, rest)).toBe(expected);
  });
});
