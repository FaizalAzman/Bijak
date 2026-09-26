/**
 * Module 20b — the weekly report for parents: this week against last week, what was
 * mastered, what the class is on at school and what to practise next, plus a short
 * version to share on WhatsApp (with the other parent, a grandparent or the teacher).
 * Derived from local progress only.
 */
import type { ContentIndex } from '@/features/content/registry';
import { allBadges } from '@/features/gamify/badges';
import { liveStreak } from '@/features/gamify/streak';
import { topicStatus } from '@/features/progress/selectors';
import { addDays, dayKey, lastNDays } from '@/lib/date';
import type { Profile, Progress } from '@/store/types';
import { weakTopics, type WeakTopic } from './insights';

export interface WeekStats {
  minutes: number;
  activeDays: number;
  quizzes: number;
  answered: number;
  /** % correct, or null without answers. */
  accuracy: number | null;
}

export interface WeeklyReport {
  name: string;
  /** First and last day of the 7 days (today is the last). */
  from: string;
  to: string;
  thisWeek: WeekStats;
  lastWeek: WeekStats;
  streak: number;
  bestStreak: number;
  mastered: { topicId: string; title: string; subject: string; emoji: string }[];
  badges: { id: string; title: string; emoji: string }[];
  /** Minutes per subject this week, most first. */
  subjects: { subject: string; emoji: string; minutes: number }[];
  atSchool: { subject: string; title: string; stars: number; mastered: boolean }[];
  practise: WeakTopic[];
}

const startOf = (day: string) => new Date(`${day}T00:00:00`).getTime();

function weekStats(p: Progress, days: string[]): WeekStats {
  const inWeek = new Set(days);
  let seconds = 0;
  let activeDays = 0;
  let answered = 0;
  let correct = 0;
  for (const d of days) {
    const stat = p.days[d];
    if (!stat) continue;
    const secs = Object.values(stat.seconds).reduce((a, b) => a + b, 0);
    seconds += secs;
    if (secs > 0) activeDays++;
    answered += stat.answered;
    correct += stat.correct;
  }
  const quizzes = p.attempts.filter((a) => inWeek.has(dayKey(new Date(a.at)))).length;
  return { minutes: Math.round(seconds / 60), activeDays, quizzes, answered, accuracy: answered ? Math.round((correct / answered) * 100) : null };
}

/** The report for one child, for the 7 days ending `today`. Use the child's own content index (their teaching language). */
export function weeklyReport(profile: Profile, p: Progress, index: ContentIndex, today = dayKey(), restDays: readonly number[] = []): WeeklyReport {
  const days = lastNDays(7, today);
  const from = days[0];
  const start = startOf(from);
  const end = startOf(addDays(today, 1));
  const within = (t: number | undefined) => t !== undefined && t >= start && t < end;

  const mastered = Object.entries(p.topics)
    .filter(([, st]) => within(st.masteredAt))
    .sort(([, a], [, b]) => (a.masteredAt ?? 0) - (b.masteredAt ?? 0))
    .flatMap(([id]) => {
      const ref = index.topic(id);
      return ref ? [{ topicId: id, title: ref.topic.title, subject: ref.subject.name, emoji: ref.topic.emoji }] : [];
    });

  const badges = allBadges(index)
    .filter((b) => within(p.badges[b.id]))
    .sort((a, b) => p.badges[a.id] - p.badges[b.id])
    .map((b) => ({ id: b.id, title: b.title, emoji: b.emoji }));

  const perSubject = new Map<string, { subject: string; emoji: string; seconds: number }>();
  for (const d of days) {
    for (const [key, secs] of Object.entries(p.days[d]?.seconds ?? {})) {
      const [stdId, subjectId] = key.split('/');
      const subject = index.subject(stdId, subjectId);
      const name = subject?.name ?? subjectId;
      const row = perSubject.get(name) ?? { subject: name, emoji: subject?.emoji ?? '📘', seconds: 0 };
      row.seconds += secs;
      perSubject.set(name, row);
    }
  }
  const subjects = [...perSubject.values()]
    .map((r) => ({ subject: r.subject, emoji: r.emoji, minutes: Math.round(r.seconds / 60) }))
    .filter((r) => r.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes || a.subject.localeCompare(b.subject));

  const standard = index.standardByLevel(profile.level);
  const atSchool = (standard?.subjects ?? []).flatMap((subject) =>
    subject.topics
      .filter((t) => t.id === profile.schoolTopics?.[subject.id])
      .map((t) => {
        const st = topicStatus(t, p);
        return { subject: subject.name, title: t.title, stars: st.stars, mastered: st.mastered };
      }),
  );

  return {
    name: profile.name,
    from,
    to: today,
    thisWeek: weekStats(p, days),
    lastWeek: weekStats(p, lastNDays(7, addDays(today, -7))),
    streak: liveStreak(p.streak, today, restDays),
    bestStreak: p.streak.best,
    mastered,
    badges,
    subjects,
    atSchool,
    practise: weakTopics(p, index, 2),
  };
}

/** "1 h 25 min", "50 min". */
export function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return h ? `${h} h ${minutes % 60} min` : `${minutes} min`;
}

const DAY = new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short' });

/** "2 Mar – 8 Mar". */
export function rangeLabel(from: string, to: string): string {
  return `${DAY.format(new Date(`${from}T12:00:00`))} – ${DAY.format(new Date(`${to}T12:00:00`))}`;
}

const stars = (n: number) => `${'★'.repeat(n)}${'☆'.repeat(3 - n)}`;

/** The report as a WhatsApp message (*bold* works there; kept short enough to read on a phone). */
export function shareText(r: WeeklyReport): string {
  const t = r.thisWeek;
  const l = r.lastWeek;
  const lines = [`📊 *${r.name}’s week on Bijak* (${rangeLabel(r.from, r.to)})`];
  if (t.activeDays === 0) {
    lines.push('No learning yet this week. A few minutes a day is all it takes!');
  } else {
    lines.push(`⏱️ ${minutesLabel(t.minutes)} over ${t.activeDays} day${t.activeDays === 1 ? '' : 's'} (last week: ${minutesLabel(l.minutes)})`);
    lines.push(`✅ ${t.quizzes} quiz${t.quizzes === 1 ? '' : 'zes'}${t.accuracy !== null ? ` · ${t.accuracy}% correct` : ''}${l.accuracy !== null ? ` (last week: ${l.accuracy}%)` : ''}`);
  }
  if (r.streak > 0) lines.push(`🔥 Streak: ${r.streak} day${r.streak === 1 ? '' : 's'} (best ${r.bestStreak})`);
  if (r.mastered.length) lines.push(`🏆 Mastered: ${r.mastered.map((m) => m.title).join('; ')}`);
  if (r.badges.length) lines.push(`🎖️ New badges: ${r.badges.map((b) => `${b.emoji} ${b.title}`).join(', ')}`);
  for (const s of r.atSchool) lines.push(`🏫 At school: ${s.subject} – ${s.title} ${s.mastered ? '(mastered ✓)' : stars(s.stars)}`);
  const [focus] = r.practise;
  if (focus) lines.push(`💡 Practise next: ${focus.title} (${focus.subject}, ${focus.accuracy}% correct)${focus.activity ? `\n   Try at home: ${focus.activity}` : ''}`);
  lines.push('_Sent from Bijak_');
  return lines.join('\n');
}
