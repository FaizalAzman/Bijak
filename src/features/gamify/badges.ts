/** Module 19 — Badges & Achievements (persistent trophy room). */
import type { ContentIndex } from '@/features/content/registry';
import type { UiLang } from '@/i18n/define';
import { standardName, subjectName } from '@/i18n/names';
import type { Progress } from '@/store/types';
import { levelFromXp } from './xp';

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  earned: (p: Progress) => boolean;
  /** 0..1 progress towards the badge, for the trophy room. */
  progress?: (p: Progress) => number;
  /** The badge in Bahasa Melayu. */
  ms?: { title: string; description: string };
}

/** Bahasa Melayu names for the fixed badges (mastery badges build their own). */
const MS: Record<string, { title: string; description: string }> = {
  'first-quiz': { title: 'Langkah Pertama', description: 'Siapkan kuiz pertama kamu' },
  'correct-10': { title: 'Minda Tajam', description: 'Jawab 10 soalan dengan betul' },
  'correct-100': { title: 'Seratus', description: 'Jawab 100 soalan dengan betul' },
  'correct-500': { title: 'Genius', description: 'Jawab 500 soalan dengan betul' },
  'streak-3': { title: 'Semangat Membara', description: 'Belajar 3 hari berturut-turut' },
  'streak-7': { title: 'Pahlawan Seminggu', description: 'Belajar 7 hari berturut-turut' },
  'streak-30': { title: 'Tak Terhenti', description: 'Belajar 30 hari berturut-turut' },
  'perfect-1': { title: 'Sempurna', description: 'Siapkan kuiz tanpa sebarang salah' },
  'perfect-10': { title: 'Si Sempurna', description: 'Siapkan 10 kuiz dengan markah penuh' },
  'combo-10': { title: 'Raja Kombo', description: 'Betul 10 kali berturut-turut' },
  'level-5': { title: 'Penjelajah', description: 'Capai tahap 5' },
  'level-10': { title: 'Cendekia', description: 'Capai tahap 10' },
  'speed-20': { title: 'Si Pantas', description: 'Skor 20+ dalam permainan lawan masa' },
  'speed-35': { title: 'Kilat', description: 'Skor 35+ dalam permainan lawan masa' },
  bookworm: { title: 'Ulat Buku', description: 'Baca 10 pelajaran' },
  reviewer: { title: 'Pantang Menyerah', description: 'Betulkan 25 soalan mencabar semasa ulang kaji' },
  shopper: { title: 'Bergaya', description: 'Beli barang pertama di kedai' },
};

export const badgeTitle = (b: BadgeDef, lang: UiLang) => (lang === 'ms' ? (b.ms?.title ?? b.title) : b.title);
export const badgeDescription = (b: BadgeDef, lang: UiLang) => (lang === 'ms' ? (b.ms?.description ?? b.description) : b.description);

const ratio = (v: number, t: number) => Math.min(1, v / t);

export const STATIC_BADGES: BadgeDef[] = [
  { id: 'first-quiz', title: 'First Steps', description: 'Finish your very first quiz', emoji: '👣', color: 'lime', earned: (p) => p.totals.quizzes >= 1 },
  {
    id: 'correct-10',
    title: 'Sharp Mind',
    description: 'Answer 10 questions correctly',
    emoji: '✏️',
    color: 'sky',
    earned: (p) => p.totals.correct >= 10,
    progress: (p) => ratio(p.totals.correct, 10),
  },
  {
    id: 'correct-100',
    title: 'Century',
    description: 'Answer 100 questions correctly',
    emoji: '💯',
    color: 'sun',
    earned: (p) => p.totals.correct >= 100,
    progress: (p) => ratio(p.totals.correct, 100),
  },
  {
    id: 'correct-500',
    title: 'Brainiac',
    description: 'Answer 500 questions correctly',
    emoji: '🧠',
    color: 'grape',
    earned: (p) => p.totals.correct >= 500,
    progress: (p) => ratio(p.totals.correct, 500),
  },
  {
    id: 'streak-3',
    title: 'On Fire',
    description: 'Learn 3 days in a row',
    emoji: '🔥',
    color: 'tangerine',
    earned: (p) => p.streak.best >= 3,
    progress: (p) => ratio(p.streak.best, 3),
  },
  {
    id: 'streak-7',
    title: 'Week Warrior',
    description: 'Learn 7 days in a row',
    emoji: '📅',
    color: 'tangerine',
    earned: (p) => p.streak.best >= 7,
    progress: (p) => ratio(p.streak.best, 7),
  },
  {
    id: 'streak-30',
    title: 'Unstoppable',
    description: 'Learn 30 days in a row',
    emoji: '🌋',
    color: 'berry',
    earned: (p) => p.streak.best >= 30,
    progress: (p) => ratio(p.streak.best, 30),
  },
  { id: 'perfect-1', title: 'Flawless', description: 'Finish a quiz with no mistakes', emoji: '💎', color: 'sky', earned: (p) => p.totals.perfect >= 1 },
  {
    id: 'perfect-10',
    title: 'Perfectionist',
    description: 'Finish 10 perfect quizzes',
    emoji: '🏅',
    color: 'sun',
    earned: (p) => p.totals.perfect >= 10,
    progress: (p) => ratio(p.totals.perfect, 10),
  },
  {
    id: 'combo-10',
    title: 'Combo King',
    description: 'Get 10 right in a row',
    emoji: '⚡',
    color: 'sun',
    earned: (p) => p.totals.bestCombo >= 10,
    progress: (p) => ratio(p.totals.bestCombo, 10),
  },
  {
    id: 'level-5',
    title: 'Explorer',
    description: 'Reach level 5',
    emoji: '🧭',
    color: 'mint',
    earned: (p) => levelFromXp(p.xp) >= 5,
    progress: (p) => ratio(levelFromXp(p.xp), 5),
  },
  {
    id: 'level-10',
    title: 'Scholar',
    description: 'Reach level 10',
    emoji: '🎓',
    color: 'grape',
    earned: (p) => levelFromXp(p.xp) >= 10,
    progress: (p) => ratio(levelFromXp(p.xp), 10),
  },
  {
    id: 'speed-20',
    title: 'Speedster',
    description: 'Score 20+ in a time-attack game',
    emoji: '🏎️',
    color: 'berry',
    earned: (p) => Object.values(p.timeAttackBest).some((v) => v >= 20),
  },
  {
    id: 'speed-35',
    title: 'Lightning',
    description: 'Score 35+ in a time-attack game',
    emoji: '🌩️',
    color: 'grape',
    earned: (p) => Object.values(p.timeAttackBest).some((v) => v >= 35),
  },
  {
    id: 'bookworm',
    title: 'Bookworm',
    description: 'Read 10 lessons',
    emoji: '📚',
    color: 'mint',
    earned: (p) => p.totals.lessons >= 10,
    progress: (p) => ratio(p.totals.lessons, 10),
  },
  {
    id: 'reviewer',
    title: 'Never Give Up',
    description: 'Fix 25 tricky questions in review',
    emoji: '🧩',
    color: 'lime',
    earned: (p) => p.totals.reviews >= 25,
    progress: (p) => ratio(p.totals.reviews, 25),
  },
  { id: 'shopper', title: 'Stylish', description: 'Buy your first item in the shop', emoji: '🛍️', color: 'berry', earned: (p) => p.totals.purchases >= 1 },
];

/**
 * Subject-mastery badges are generated from the syllabus, so "Standard 4 Science Master"
 * appears automatically once Standard 4 Science content exists. Mastery = every quiz in
 * the subject scored ≥ 80%.
 */
export function masteryBadges(index: ContentIndex): BadgeDef[] {
  const out: BadgeDef[] = [];
  for (const std of index.standards) {
    for (const subject of std.subjects) {
      const quizzes = subject.topics.flatMap((t) => t.quizzes.map((q) => ({ topicId: t.id, quizId: q.id })));
      if (quizzes.length < 2) continue;
      const done = (p: Progress) => quizzes.filter((q) => (p.topics[q.topicId]?.best[q.quizId] ?? 0) >= 80).length;
      const [stdMs, subjectMs] = [standardName(std, 'ms'), subjectName(subject, 'ms')];
      out.push({
        id: `master-${std.id}-${subject.id}`,
        title: `${std.title} ${subject.name} Master`,
        description: `Score 80%+ on every ${subject.name} quiz in ${std.title}`,
        ms: { title: `Pakar ${subjectMs} ${stdMs}`, description: `Dapat 80%+ dalam setiap kuiz ${subjectMs} ${stdMs}` },
        emoji: subject.emoji,
        color: subject.color,
        earned: (p) => done(p) === quizzes.length,
        progress: (p) => done(p) / quizzes.length,
      });
    }
  }
  return out;
}

for (const b of STATIC_BADGES) b.ms = MS[b.id];

export function allBadges(index: ContentIndex): BadgeDef[] {
  return [...STATIC_BADGES, ...masteryBadges(index)];
}

export function newlyEarned(p: Progress, index: ContentIndex): BadgeDef[] {
  return allBadges(index).filter((b) => !p.badges[b.id] && b.earned(p));
}
