import { buildIndex, getContentIndex } from '@/features/content/registry';
import { Standard } from '@/features/content/schema';
import { allBadges, badgeDescription, badgeTitle, masteryBadges, newlyEarned, STATIC_BADGES } from '@/features/gamify/badges';
import { xpForLevel } from '@/features/gamify/xp';
import { emptyProgress } from '@/store/app';
import type { Progress } from '@/store/types';

const badge = (id: string) => STATIC_BADGES.find((b) => b.id === id)!;
const withP = (fn: (p: Progress) => void) => {
  const p = emptyProgress();
  fn(p);
  return p;
};

describe('static badges', () => {
  it('have unique ids and complete copy', () => {
    expect(new Set(STATIC_BADGES.map((b) => b.id)).size).toBe(STATIC_BADGES.length);
    for (const b of STATIC_BADGES) {
      expect(b.title.trim()).not.toBe('');
      expect(b.description.trim()).not.toBe('');
      expect(b.emoji.trim()).not.toBe('');
    }
  });

  it('none are earned by a brand-new learner', () => {
    const p = emptyProgress();
    for (const b of STATIC_BADGES) expect(b.earned(p)).toBe(false);
  });

  it.each([
    ['first-quiz', (p: Progress, n: number) => (p.totals.quizzes = n), 1],
    ['correct-10', (p: Progress, n: number) => (p.totals.correct = n), 10],
    ['correct-100', (p: Progress, n: number) => (p.totals.correct = n), 100],
    ['correct-500', (p: Progress, n: number) => (p.totals.correct = n), 500],
    ['streak-3', (p: Progress, n: number) => (p.streak.best = n), 3],
    ['streak-7', (p: Progress, n: number) => (p.streak.best = n), 7],
    ['streak-30', (p: Progress, n: number) => (p.streak.best = n), 30],
    ['perfect-1', (p: Progress, n: number) => (p.totals.perfect = n), 1],
    ['perfect-10', (p: Progress, n: number) => (p.totals.perfect = n), 10],
    ['combo-10', (p: Progress, n: number) => (p.totals.bestCombo = n), 10],
    ['bookworm', (p: Progress, n: number) => (p.totals.lessons = n), 10],
    ['reviewer', (p: Progress, n: number) => (p.totals.reviews = n), 25],
    ['shopper', (p: Progress, n: number) => (p.totals.purchases = n), 1],
    ['speed-20', (p: Progress, n: number) => (p.timeAttackBest = { g: n }), 20],
    ['speed-35', (p: Progress, n: number) => (p.timeAttackBest = { g: n }), 35],
  ])('%s unlocks exactly at its threshold', (id, set, threshold) => {
    const b = badge(id);
    expect(b.earned(withP((p) => set(p, threshold - 1)))).toBe(false);
    expect(b.earned(withP((p) => set(p, threshold)))).toBe(true);
    if (b.progress) {
      expect(b.progress(withP((p) => set(p, threshold)))).toBe(1);
      expect(b.progress(withP((p) => set(p, threshold * 10)))).toBe(1);
      expect(b.progress(withP((p) => set(p, threshold - 1)))).toBeLessThan(1);
    }
  });

  it('level badges follow the XP curve', () => {
    expect(badge('level-5').earned(withP((p) => (p.xp = xpForLevel(5) - 1)))).toBe(false);
    expect(badge('level-5').earned(withP((p) => (p.xp = xpForLevel(5))))).toBe(true);
    expect(badge('level-10').earned(withP((p) => (p.xp = xpForLevel(10))))).toBe(true);
  });

  it('progress is always within 0..1', () => {
    for (const b of STATIC_BADGES) {
      if (!b.progress) continue;
      for (const n of [0, 1, 5, 50, 5000]) {
        const p = withP((x) => {
          x.totals = { answered: n, correct: n, quizzes: n, perfect: n, lessons: n, reviews: n, bestCombo: n, purchases: n };
          x.streak.best = n;
          x.xp = n * 10;
        });
        const v = b.progress(p);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('badges in Bahasa Melayu', () => {
  it('every badge has a Malay name and description', () => {
    const sameName = new Set(['correct-500']); // "Genius" in both
    for (const b of allBadges(getContentIndex())) {
      expect(badgeTitle(b, 'ms')).toBe(b.ms?.title);
      expect(badgeDescription(b, 'ms')).toBe(b.ms?.description);
      expect(badgeDescription(b, 'ms')).not.toBe(b.description);
      if (!sameName.has(b.id)) expect(badgeTitle(b, 'ms')).not.toBe(b.title);
      expect([badgeTitle(b, 'en'), badgeDescription(b, 'en')]).toEqual([b.title, b.description]);
    }
  });

  it('mastery badges name the subject and standard in Malay', () => {
    const b = allBadges(getContentIndex()).find((x) => x.id === 'master-std3-math')!;
    expect(badgeTitle(b, 'ms')).toBe('Pakar Matematik Tahun 3');
    expect(badgeDescription(b, 'ms')).toBe('Dapat 80%+ dalam setiap kuiz Matematik Tahun 3');
  });

  it('a badge without a Malay name falls back to English', () => {
    const b = { ...STATIC_BADGES[0], ms: undefined };
    expect([badgeTitle(b, 'ms'), badgeDescription(b, 'ms')]).toEqual([b.title, b.description]);
  });
});

describe('mastery badges', () => {
  const std = Standard.parse({
    id: 'stdx',
    level: 9,
    title: 'Standard 9',
    version: 1,
    subjects: [
      {
        id: 'math',
        name: 'Maths',
        emoji: '🔢',
        topics: [
          { id: 'tx1', title: 'A', quizzes: [{ id: 'qx1', title: 'Q1', generator: { kind: 'addition', max: 10 } }] },
          { id: 'tx2', title: 'B', quizzes: [{ id: 'qx2', title: 'Q2', generator: { kind: 'addition', max: 10 } }] },
        ],
      },
      { id: 'sci', name: 'Science', emoji: '🔬', topics: [{ id: 'tx3', title: 'C', quizzes: [{ id: 'qx3', title: 'Q3', generator: { kind: 'addition', max: 10 } }] }] },
    ],
  });
  const index = buildIndex([std]);

  it('are generated per subject with at least two quizzes', () => {
    expect(masteryBadges(index).map((b) => b.id)).toEqual(['master-stdx-math']);
  });

  it('need 80%+ on every quiz of the subject', () => {
    const [b] = masteryBadges(index);
    const p = emptyProgress();
    p.topics.tx1 = { answered: 1, correct: 1, lessonDone: false, best: { qx1: 100 }, lastAt: 0 };
    expect(b.earned(p)).toBe(false);
    expect(b.progress!(p)).toBe(0.5);
    p.topics.tx2 = { answered: 1, correct: 1, lessonDone: false, best: { qx2: 79 }, lastAt: 0 };
    expect(b.earned(p)).toBe(false);
    p.topics.tx2.best.qx2 = 80;
    expect(b.earned(p)).toBe(true);
  });

  it('newlyEarned skips badges already in the trophy room', () => {
    const p = emptyProgress();
    p.totals.quizzes = 1;
    expect(newlyEarned(p, index).map((b) => b.id)).toEqual(['first-quiz']);
    p.badges['first-quiz'] = 123;
    expect(newlyEarned(p, index)).toEqual([]);
  });

  it('all badge ids are unique across static and generated badges', () => {
    const ids = allBadges(index).map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
