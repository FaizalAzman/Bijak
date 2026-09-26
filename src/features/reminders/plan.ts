/**
 * Module 21 — Gentle reminders, planned on the device (no server, no push tokens).
 *
 * Off until a parent turns them on, and never more than a nudge:
 * - a daily "quests are ready" reminder at the parent's chosen time, on school days only,
 *   and not today once every child has already played;
 * - a "save the streak" nudge at 7:30 pm, only when a streak of 2+ days would end tonight
 *   (no shield to cover it, not a rest day) and no daily reminder went out within the hour;
 * - the weekly report, the evening before the school week starts.
 * The plan covers the next 7 days and is rebuilt whenever the app opens or progress
 * changes — so a family that stops using Bijak stops hearing from it within a week.
 */
import { isRestDay, liveStreak, streakStatus, weekday, type StreakState } from '@/features/gamify/streak';
import { addDays, dayKey } from '@/lib/date';

export interface Reminders {
  daily: boolean;
  /** "HH:MM", local time. */
  time: string;
  streak: boolean;
  weekly: boolean;
}

export const REMINDER_TIMES = ['16:00', '17:00', '18:00', '19:00', '20:00'] as const;
export const DEFAULT_REMINDERS: Reminders = { daily: false, time: '17:00', streak: false, weekly: false };
export const STREAK_NUDGE_AT = '19:30';
export const WEEKLY_AT = '20:00';
export const PLAN_DAYS = 7;
/** A streak nudge this close to a daily reminder would be nagging. */
const NUDGE_GAP_MS = 60 * 60 * 1000;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Only known switches and a valid time survive; anything else keeps `base`. */
export function cleanReminders(value: unknown, base: Reminders = DEFAULT_REMINDERS): Reminders {
  const r = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const flag = (key: 'daily' | 'streak' | 'weekly') => (typeof r[key] === 'boolean' ? (r[key] as boolean) : base[key]);
  return { daily: flag('daily'), time: typeof r.time === 'string' && TIME.test(r.time) ? r.time : base.time, streak: flag('streak'), weekly: flag('weekly') };
}

/** "17:00" → "5:00 pm". */
export function timeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

export interface ChildState {
  name: string;
  streak: StreakState;
}

export interface PlanInput {
  now: Date;
  reminders: Reminders;
  restDays: readonly number[];
  children: ChildState[];
}

export interface PlannedReminder {
  /** Stable per kind and day, e.g. "bijak-daily-2026-03-02". */
  id: string;
  kind: 'daily' | 'streak' | 'weekly';
  at: Date;
  title: string;
  body: string;
  /** Where tapping it goes. */
  url: string;
}

const at = (day: string, time: string) => new Date(`${day}T${time}:00`);

/** "Adam", "Adam and Aina", "Adam, Aina and Ali". */
export function joinNames(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** Everything Bijak should have scheduled right now, earliest first. */
export function planReminders({ now, reminders, restDays, children }: PlanInput): PlannedReminder[] {
  if (!children.length) return [];
  const today = dayKey(now);
  const plan: PlannedReminder[] = [];
  const playedToday = (c: ChildState) => c.streak.lastDay === today;
  const streakAtRisk = (c: ChildState) => !playedToday(c) && streakStatus(c.streak, today, restDays) === 'atRisk' && liveStreak(c.streak, today, restDays) >= 2;

  if (reminders.daily) {
    for (let i = 0; i < PLAN_DAYS; i++) {
      const day = addDays(today, i);
      const when = at(day, reminders.time);
      if (isRestDay(day, restDays) || when <= now) continue;
      const waiting = i === 0 ? children.filter((c) => !playedToday(c)) : children;
      if (!waiting.length) continue;
      const atRisk = i === 0 ? waiting.filter(streakAtRisk) : [];
      let body: string;
      if (waiting.length === 1) {
        const [c] = waiting;
        body = atRisk.length ? `${c.name}’s quests are ready, and a ${liveStreak(c.streak, today, restDays)}-day streak to keep going!` : `${c.name}’s quests are ready. Ten minutes is plenty!`;
      } else {
        body = `Quests are ready for ${joinNames(waiting.map((c) => c.name))}.${atRisk.length ? ' Keep those streaks going!' : ' Ten minutes each is plenty!'}`;
      }
      plan.push({ id: `bijak-daily-${day}`, kind: 'daily', at: when, title: 'Time for Bijak 📚', body, url: '/' });
    }
  }

  if (reminders.streak) {
    const atRisk = children.filter(streakAtRisk);
    const when = at(today, STREAK_NUDGE_AT);
    const daily = plan.find((p) => p.id === `bijak-daily-${today}`);
    const nearDaily = daily && Math.abs(daily.at.getTime() - when.getTime()) < NUDGE_GAP_MS;
    if (atRisk.length && when > now && !nearDaily) {
      const days = (c: ChildState) => liveStreak(c.streak, today, restDays);
      plan.push(
        atRisk.length === 1
          ? { id: `bijak-streak-${today}`, kind: 'streak', at: when, title: `🔥 Keep ${atRisk[0].name}’s ${days(atRisk[0])}-day streak`, body: 'One quick quiz before bed keeps it going.', url: '/' }
          : {
              id: `bijak-streak-${today}`,
              kind: 'streak',
              at: when,
              title: '🔥 Keep the streaks going',
              body: `${joinNames(atRisk.map((c) => `${c.name} (${days(c)} days)`))} haven’t played today. One quick quiz each keeps them going.`,
              url: '/',
            },
      );
    }
  }

  if (reminders.weekly) {
    // The evening before the school week: Saturday where the weekend is Friday–Saturday.
    const reportDay = restDays.includes(5) && restDays.includes(6) ? 6 : 0;
    for (let i = 0; i <= PLAN_DAYS; i++) {
      const day = addDays(today, i);
      const when = at(day, WEEKLY_AT);
      if (weekday(day) !== reportDay || when <= now) continue;
      plan.push({
        id: `bijak-weekly-${day}`,
        kind: 'weekly',
        at: when,
        title: '📊 Your weekly Bijak report',
        body: `See what ${joinNames(children.map((c) => c.name))} learned this week, and what to practise next.`,
        url: '/parent?next=report',
      });
      break;
    }
  }

  return plan.sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id));
}
