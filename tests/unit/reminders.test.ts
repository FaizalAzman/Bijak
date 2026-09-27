/**
 * Gentle reminders: what gets planned, when, and — just as important — when Bijak stays quiet.
 */
import type { StreakState } from '@/features/gamify/streak';
import { cleanReminders, DEFAULT_REMINDERS, planReminders, PLAN_DAYS, type ChildState, type PlanInput, type Reminders } from '@/features/reminders/plan';
import { joinNames, timeLabel } from '@/i18n';

const MON = '2026-03-02';
const at = (local: string) => new Date(local);
const streak = (over: Partial<StreakState> = {}): StreakState => ({ current: 0, best: 0, lastDay: null, shields: 0, ...over });
const child = (name: string, s: Partial<StreakState> = {}): ChildState => ({ name, streak: streak(s) });
const on = (over: Partial<Reminders> = {}): Reminders => ({ ...DEFAULT_REMINDERS, ...over });
const plan = (over: Partial<PlanInput> = {}) =>
  planReminders({ now: at(`${MON}T09:00:00`), reminders: on({ daily: true }), restDays: [], children: [child('Adam')], lang: 'en', ...over });
const summary = (input: Partial<PlanInput> = {}) => plan(input).map((r) => `${r.id} ${r.at.toTimeString().slice(0, 5)}`);

describe('daily reminder', () => {
  it('is off by default, and needs a child to remind', () => {
    expect(plan({ reminders: DEFAULT_REMINDERS })).toEqual([]);
    expect(plan({ children: [] })).toEqual([]);
  });

  it('plans the next 7 days at the chosen time, opening the app', () => {
    const r = plan();
    expect(r).toHaveLength(PLAN_DAYS);
    expect(summary()).toEqual([2, 3, 4, 5, 6, 7, 8].map((d) => `bijak-daily-2026-03-0${d} 17:00`));
    expect(r[0]).toMatchObject({ kind: 'daily', title: 'Time for Bijak 📚', body: 'Adam’s quests are ready. Ten minutes is plenty!', url: '/' });
    expect(summary({ reminders: on({ daily: true, time: '19:00' }) })[0]).toBe('bijak-daily-2026-03-02 19:00');
  });

  it('skips rest days (a Saturday-and-Sunday weekend here)', () => {
    expect(summary({ restDays: [6, 0] })).toEqual([2, 3, 4, 5, 6].map((d) => `bijak-daily-2026-03-0${d} 17:00`));
  });

  it('skips today once the time has passed', () => {
    expect(summary({ now: at(`${MON}T17:00:00`) })[0]).toBe('bijak-daily-2026-03-03 17:00');
    expect(plan({ now: at(`${MON}T17:00:00`) })).toHaveLength(PLAN_DAYS - 1);
  });

  it('skips today once every child has played, and only names those who haven’t', () => {
    expect(summary({ children: [child('Adam', { current: 1, best: 1, lastDay: MON })] })[0]).toBe('bijak-daily-2026-03-03 17:00');
    const both = plan({ children: [child('Adam', { current: 1, best: 1, lastDay: MON }), child('Aina')] });
    expect(both[0]).toMatchObject({ id: `bijak-daily-${MON}`, body: 'Aina’s quests are ready. Ten minutes is plenty!' });
    expect(both[1].body).toBe('Quests are ready for Adam and Aina. Ten minutes each is plenty!');
  });

  it('mentions a streak that would end today (2+ days, no shield to cover it)', () => {
    const atRisk = child('Adam', { current: 5, best: 5, lastDay: '2026-03-01' });
    expect(plan({ children: [atRisk] })[0].body).toBe('Adam’s quests are ready, and a 5-day streak to keep going!');
    // Tomorrow's reminder can't know yet.
    expect(plan({ children: [atRisk] })[1].body).toBe('Adam’s quests are ready. Ten minutes is plenty!');
    expect(plan({ children: [child('Adam', { current: 5, best: 5, lastDay: '2026-03-01', shields: 1 })] })[0].body).toBe('Adam’s quests are ready. Ten minutes is plenty!');
    expect(plan({ children: [child('Adam', { current: 1, best: 1, lastDay: '2026-03-01' })] })[0].body).toBe('Adam’s quests are ready. Ten minutes is plenty!');
    expect(plan({ children: [atRisk, child('Aina')] })[0].body).toBe('Quests are ready for Adam and Aina. Keep those streaks going!');
  });
});

describe('save-the-streak nudge', () => {
  const nudgeOnly = on({ streak: true });
  const atRisk = (over: Partial<StreakState> = {}) => child('Adam', { current: 6, best: 6, lastDay: '2026-03-01', ...over });

  it('comes at 7:30 pm when a streak of 2+ days would end tonight', () => {
    expect(plan({ reminders: nudgeOnly, children: [atRisk()] })).toEqual([
      { id: `bijak-streak-${MON}`, kind: 'streak', at: at(`${MON}T19:30:00`), title: '🔥 Keep Adam’s 6-day streak', body: 'One quick quiz before bed keeps it going.', url: '/' },
    ]);
  });

  it.each<[string, Partial<PlanInput>]>([
    ['the child already played today', { children: [atRisk({ lastDay: MON })] }],
    ['a shield would cover today', { children: [atRisk({ shields: 1 })] }],
    ['today is a rest day', { restDays: [1] }],
    ['the streak is only 1 day', { children: [atRisk({ current: 1, best: 1 })] }],
    ['the streak already ended (missed yesterday too)', { children: [atRisk({ lastDay: '2026-02-28' })] }],
    ['it is already past 7:30 pm', { now: at(`${MON}T19:30:00`) }],
  ])('stays quiet when %s', (_, over) => {
    expect(plan({ reminders: nudgeOnly, children: [atRisk()], ...over })).toEqual([]);
  });

  it('is dropped when the daily reminder is within the hour (that one mentions the streak)', () => {
    const kinds = (time: string, now = `${MON}T09:00:00`) => plan({ reminders: on({ daily: true, streak: true, time }), children: [atRisk()], now: at(now) }).filter((r) => r.id.endsWith(MON)).map((r) => r.kind);
    expect(kinds('19:00')).toEqual(['daily']);
    expect(kinds('20:00')).toEqual(['daily']);
    expect(kinds('18:00')).toEqual(['daily', 'streak']);
    // Today's reminder time has passed, so the nudge is the only one left today.
    expect(kinds('19:00', `${MON}T19:10:00`)).toEqual(['streak']);
  });

  it('names every child whose streak is at risk', () => {
    const [r] = plan({ reminders: nudgeOnly, children: [atRisk(), child('Aina', { current: 3, best: 3, lastDay: '2026-03-01' }), child('Ali')] });
    expect(r).toMatchObject({ title: '🔥 Keep the streaks going', body: 'Adam (6 days) and Aina (3 days) haven’t played today. One quick quiz each keeps them going.' });
  });
});

describe('weekly report', () => {
  const weekly = on({ weekly: true });
  const names = [child('Adam'), child('Aina')];

  it('comes on Sunday evening and opens the report behind the parent PIN', () => {
    expect(plan({ reminders: weekly, children: names })).toEqual([
      {
        id: 'bijak-weekly-2026-03-08',
        kind: 'weekly',
        at: at('2026-03-08T20:00:00'),
        title: '📊 Your weekly Bijak report',
        body: 'See what Adam and Aina learned this week, and what to practise next.',
        url: '/parent?next=report',
      },
    ]);
  });

  it('comes on Saturday evening where the weekend is Friday–Saturday', () => {
    expect(plan({ reminders: weekly, restDays: [5, 6] })[0].at).toEqual(at('2026-03-07T20:00:00'));
    expect(plan({ reminders: weekly, restDays: [6, 0] })[0].at).toEqual(at('2026-03-08T20:00:00'));
  });

  it('on report day: tonight if still ahead, otherwise next week', () => {
    expect(plan({ reminders: weekly, now: at('2026-03-08T19:00:00') })[0].at).toEqual(at('2026-03-08T20:00:00'));
    expect(plan({ reminders: weekly, now: at('2026-03-08T21:00:00') })[0].at).toEqual(at('2026-03-15T20:00:00'));
  });
});

describe('the whole plan', () => {
  it('is sorted by time with unique ids, all within the coming week', () => {
    const now = at(`${MON}T09:00:00`);
    const r = plan({ reminders: on({ daily: true, streak: true, weekly: true, time: '16:00' }), children: [child('Adam', { current: 4, best: 4, lastDay: '2026-03-01' })] });
    expect(r.map((x) => x.kind)).toEqual(['daily', 'streak', 'daily', 'daily', 'daily', 'daily', 'daily', 'daily', 'weekly']);
    expect(new Set(r.map((x) => x.id)).size).toBe(r.length);
    for (let i = 1; i < r.length; i++) expect(r[i].at.getTime()).toBeGreaterThanOrEqual(r[i - 1].at.getTime());
    for (const x of r) expect(x.at.getTime() - now.getTime()).toBeLessThanOrEqual(8 * 24 * 3600_000);
  });
});

describe('helpers', () => {
  it('cleanReminders keeps known switches and a valid 24-hour time', () => {
    expect(cleanReminders({ daily: true, time: '18:30', streak: true, weekly: false, extra: 1 })).toEqual({ daily: true, time: '18:30', streak: true, weekly: false });
    expect(cleanReminders({ daily: 'yes', time: '25:00', streak: 1 })).toEqual(DEFAULT_REMINDERS);
    expect(cleanReminders({ time: '7:00' }).time).toBe('17:00');
    expect(cleanReminders(null)).toEqual(DEFAULT_REMINDERS);
    expect(cleanReminders({ weekly: true }, on({ daily: true, time: '19:00' }))).toEqual({ daily: true, time: '19:00', streak: false, weekly: true });
  });

  it('are written in the app language', () => {
    const kids = [child('Adam', { current: 3, best: 3, lastDay: '2026-03-01' }), child('Aina', { current: 2, best: 2, lastDay: '2026-03-01' })];
    const all = plan({ lang: 'ms', children: kids, reminders: on({ daily: true, streak: true, weekly: true, time: '16:00' }) });
    const [daily, streak] = all;
    expect(daily).toMatchObject({ kind: 'daily', title: 'Masa untuk Bijak 📚', body: 'Misi sudah sedia untuk Adam dan Aina. Teruskan rentetan itu!' });
    expect(streak).toMatchObject({ kind: 'streak', title: '🔥 Kekalkan rentetan itu', body: 'Adam (3 hari) dan Aina (2 hari) belum bermain hari ini. Satu kuiz ringkas seorang akan mengekalkannya.' });
    expect(all.find((r) => r.kind === 'weekly')).toMatchObject({ title: '📊 Laporan mingguan Bijak anda', body: 'Lihat apa yang Adam dan Aina pelajari minggu ini, dan apa yang perlu dilatih seterusnya.' });
    const one = plan({ lang: 'ms', children: [kids[0]], reminders: on({ daily: true, streak: true, time: '16:00' }) });
    expect(one[0].body).toBe('Misi Adam sudah sedia, dan ada rentetan 3 hari untuk diteruskan!');
    expect(one[1]).toMatchObject({ title: '🔥 Kekalkan rentetan 3 hari Adam', body: 'Satu kuiz ringkas sebelum tidur akan mengekalkannya.' });
    expect(plan({ lang: 'ms' })[0].body).toBe('Misi Adam sudah sedia. Sepuluh minit pun cukup!');
  });

  it('timeLabel and joinNames read naturally in both languages', () => {
    const times = ['00:05', '09:30', '12:00', '13:15', '17:00', '19:30', '23:59'];
    expect(times.map((t) => timeLabel(t, 'en'))).toEqual(['12:05 am', '9:30 am', '12:00 pm', '1:15 pm', '5:00 pm', '7:30 pm', '11:59 pm']);
    expect(times.map((t) => timeLabel(t, 'ms'))).toEqual(['12:05 pagi', '9:30 pagi', '12:00 tengah hari', '1:15 tengah hari', '5:00 petang', '7:30 malam', '11:59 malam']);
    const lists = [[], ['Adam'], ['Adam', 'Aina'], ['Adam', 'Aina', 'Ali']];
    expect(lists.map((n) => joinNames(n, 'en'))).toEqual(['', 'Adam', 'Adam and Aina', 'Adam, Aina and Ali']);
    expect(lists.map((n) => joinNames(n, 'ms'))).toEqual(['', 'Adam', 'Adam dan Aina', 'Adam, Aina dan Ali']);
  });
});
