/** Module 16 — Daily Quests. Three missions per child per day, seeded so they are stable across restarts. */
import type { Lang } from '@/features/content/schema';
import { translate, type UiLang } from '@/i18n/core';
import { subjectName } from '@/i18n/names';
import { hashString, pick, seeded, shuffle } from '@/lib/random';

export type QuestKind = 'quizzesInSubject' | 'correct' | 'combo' | 'lesson' | 'timeAttack' | 'review' | 'perfect' | 'xp';

export interface Quest {
  id: string;
  kind: QuestKind;
  title: string;
  emoji: string;
  target: number;
  progress: number;
  reward: number;
  subjectId?: string;
  /** The subject's name when the quest was set (in the child's teaching language)… */
  subjectName?: string;
  /** …its name in the other language, and the teaching language (to name it in the app language). */
  subjectNameAlt?: string;
  subjectLang?: Lang;
  claimed: boolean;
  /** The child has been told this quest is complete (so the toast shows once). */
  notified?: boolean;
}

/** `review` sessions mix subjects, so they never count towards a subject's quiz quest. */
export type QuestEvent =
  | { type: 'answer'; correct: boolean; combo: number }
  | { type: 'quizComplete'; subjectId: string; perfect: boolean; timeAttack: boolean; review?: boolean }
  | { type: 'lesson' }
  | { type: 'review'; correct: boolean }
  | { type: 'xp'; amount: number };

interface SubjectLite {
  id: string;
  name: string;
  nameAlt?: string;
  lang?: Lang;
  emoji: string;
}

export function generateDailyQuests(profileId: string, day: string, subjects: SubjectLite[], reviewDue: number): Quest[] {
  const rng = seeded(hashString(`${profileId}:${day}`));
  const makers: (() => Omit<Quest, 'id' | 'progress' | 'claimed'>)[] = [
    () => {
      const s = subjects.length ? pick(rng, subjects) : { id: 'math', name: 'Mathematics', emoji: '🔢' };
      const n = pick(rng, [1, 2]);
      return {
        kind: 'quizzesInSubject',
        subjectId: s.id,
        subjectName: s.name,
        ...('nameAlt' in s && s.nameAlt ? { subjectNameAlt: s.nameAlt } : {}),
        ...('lang' in s && s.lang ? { subjectLang: s.lang } : {}),
        title: `Complete ${n} ${s.name} quiz${n > 1 ? 'zes' : ''}`,
        emoji: s.emoji,
        target: n,
        reward: 20 + n * 10,
      };
    },
    () => {
      const n = pick(rng, [15, 20, 25]);
      return { kind: 'correct', title: `Get ${n} answers right`, emoji: '✅', target: n, reward: 30 };
    },
    () => {
      const n = pick(rng, [5, 8, 10]);
      return { kind: 'combo', title: `Get ${n} right in a row`, emoji: '🔥', target: n, reward: 25 + n };
    },
    () => ({ kind: 'lesson', title: 'Read a lesson', emoji: '📖', target: 1, reward: 20 }),
    () => ({ kind: 'timeAttack', title: 'Play a time-attack game', emoji: '⚡', target: 1, reward: 20 }),
    () => ({ kind: 'perfect', title: 'Finish a quiz with no mistakes', emoji: '💎', target: 1, reward: 35 }),
    () => {
      const n = pick(rng, [150, 250]);
      return { kind: 'xp', title: `Earn ${n} XP`, emoji: '⭐', target: n, reward: 25 };
    },
  ];
  if (reviewDue >= 3) makers.push(() => ({ kind: 'review', title: 'Fix 3 tricky questions', emoji: '🧠', target: 3, reward: 30 }));
  return shuffle(makers, rng)
    .slice(0, 3)
    .map((m, i) => ({ ...m(), id: `${day}-${i}`, progress: 0, claimed: false }));
}

/** What the quest asks, in the app language (`title` keeps the English text it was saved with). */
export function questText(q: Quest, lang: UiLang): string {
  switch (q.kind) {
    case 'quizzesInSubject':
      return q.subjectName
        ? translate(lang, 'quest.quizzesInSubject', q.target, subjectName({ name: q.subjectName, nameAlt: q.subjectNameAlt, lang: q.subjectLang ?? 'en' }, lang))
        : q.title;
    case 'correct':
      return translate(lang, 'quest.correct', q.target);
    case 'combo':
      return translate(lang, 'quest.combo', q.target);
    case 'lesson':
      return translate(lang, 'quest.lesson');
    case 'timeAttack':
      return translate(lang, 'quest.timeAttack');
    case 'perfect':
      return translate(lang, 'quest.perfect');
    case 'xp':
      return translate(lang, 'quest.xp', q.target);
    case 'review':
      return translate(lang, 'quest.review', q.target);
  }
}

function delta(q: Quest, e: QuestEvent): number | 'set' {
  switch (q.kind) {
    case 'correct':
      return e.type === 'answer' && e.correct ? 1 : 0;
    case 'combo':
      return e.type === 'answer' && e.correct && e.combo > q.progress ? 'set' : 0;
    case 'quizzesInSubject':
      return e.type === 'quizComplete' && !e.timeAttack && !e.review && e.subjectId === q.subjectId ? 1 : 0;
    case 'lesson':
      return e.type === 'lesson' ? 1 : 0;
    case 'timeAttack':
      return e.type === 'quizComplete' && e.timeAttack ? 1 : 0;
    case 'perfect':
      return e.type === 'quizComplete' && e.perfect && !e.timeAttack ? 1 : 0;
    case 'review':
      return e.type === 'review' && e.correct ? 1 : 0;
    case 'xp':
      return e.type === 'xp' ? e.amount : 0;
  }
}

/** Applies an event; returns new quests and the ids that just became complete. */
export function applyQuestEvent(quests: Quest[], e: QuestEvent): { quests: Quest[]; completed: string[] } {
  const completed: string[] = [];
  const next = quests.map((q) => {
    if (q.progress >= q.target) return q;
    const d = delta(q, e);
    if (d === 0) return q;
    const progress = Math.min(q.target, d === 'set' ? (e as { combo: number }).combo : q.progress + d);
    if (progress >= q.target) completed.push(q.id);
    return { ...q, progress };
  });
  return { quests: next, completed };
}
