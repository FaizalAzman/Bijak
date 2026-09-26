import { hintedXp, levelFromXp, levelProgress, quizPoints, REWARDS, TIERS, tierFor, xpForAnswer, xpForLevel } from '@/features/gamify/xp';
import { translate } from '@/i18n';

describe('levels', () => {
  it('follows 50·L·(L−1): 0, 100, 300, 600, 1000…', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000]);
  });

  it('levelFromXp is the exact inverse at every boundary up to level 200', () => {
    for (let L = 1; L <= 200; L++) {
      const at = xpForLevel(L);
      expect(levelFromXp(at)).toBe(L);
      if (L > 1) expect(levelFromXp(at - 1)).toBe(L - 1);
      expect(levelFromXp(xpForLevel(L + 1) - 1)).toBe(L);
    }
  });

  it('is monotonic', () => {
    let prev = 1;
    for (let xp = 0; xp <= 20_000; xp += 7) {
      const l = levelFromXp(xp);
      expect(l).toBeGreaterThanOrEqual(prev);
      prev = l;
    }
  });

  it('treats bad input as zero XP instead of returning NaN', () => {
    expect(levelFromXp(-500)).toBe(1);
    expect(levelFromXp(Number.NaN)).toBe(1);
    expect(levelFromXp(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it('levelProgress reports progress inside the current level', () => {
    expect(levelProgress(150)).toEqual({ level: 2, into: 50, needed: 200, ratio: 0.25 });
    expect(levelProgress(0)).toEqual({ level: 1, into: 0, needed: 100, ratio: 0 });
    for (let xp = 0; xp < 5000; xp += 37) {
      const p = levelProgress(xp);
      expect(p.ratio).toBeGreaterThanOrEqual(0);
      expect(p.ratio).toBeLessThan(1);
      expect(p.into).toBeLessThan(p.needed);
    }
  });

  it.each([
    [1, 'Rookie'],
    [4, 'Rookie'],
    [5, 'Explorer'],
    [9, 'Explorer'],
    [10, 'Scholar'],
    [15, 'Champion'],
    [20, 'Legend'],
    [99, 'Legend'],
  ])('level %i is tier %s', (level, name) => {
    expect(tierFor(level).name).toBe(name);
  });

  it('tiers are sorted and start at level 1', () => {
    expect(TIERS[0].from).toBe(1);
    TIERS.forEach((t, i) => i && expect(t.from).toBeGreaterThan(TIERS[i - 1].from));
  });
});

describe('hints', () => {
  it(`a hinted right answer is worth 1/${REWARDS.hintDivisor} of a point and of the XP (rounded up)`, () => {
    expect([quizPoints(8, 0), quizPoints(8, 2), quizPoints(3, 3), quizPoints(0, 0)]).toEqual([8, 7, 1.5, 0]);
    expect([1, 2, 3].map(hintedXp)).toEqual([1, 2, 3].map((d) => Math.ceil(xpForAnswer(d, 0) / REWARDS.hintDivisor)));
    expect(hintedXp(1)).toBeLessThan(xpForAnswer(1, 0));
  });
});

describe('tier names', () => {
  it('every tier is named in both languages', () => {
    expect(TIERS.map((t) => translate('en', t.key))).toEqual(TIERS.map((t) => t.name));
    expect(TIERS.map((t) => translate('ms', t.key))).toEqual(['Pemula', 'Penjelajah', 'Cendekia', 'Juara', 'Lagenda']);
  });
});

describe('xpForAnswer', () => {
  it('rewards harder questions', () => {
    expect(xpForAnswer(1, 0)).toBe(10);
    expect(xpForAnswer(2, 0)).toBe(15);
    expect(xpForAnswer(3, 0)).toBe(20);
  });

  it('adds a combo bonus from 3 in a row, capped at +10', () => {
    expect(xpForAnswer(1, 2)).toBe(10);
    expect(xpForAnswer(1, 3)).toBe(12);
    expect(xpForAnswer(1, 5)).toBe(16);
    expect(xpForAnswer(1, 7)).toBe(20);
    expect(xpForAnswer(1, 50)).toBe(20);
  });

  it('time-attack answers earn a small flat amount', () => {
    expect(xpForAnswer(3, 0, true)).toBe(2);
    expect(xpForAnswer(3, 4, true)).toBe(2);
    expect(xpForAnswer(1, 5, true)).toBe(4);
  });

  it('never returns less for a longer combo', () => {
    for (const d of [1, 2, 3])
      for (let c = 1; c < 30; c++) {
        expect(xpForAnswer(d, c)).toBeGreaterThanOrEqual(xpForAnswer(d, c - 1));
        expect(xpForAnswer(d, c, true)).toBeGreaterThanOrEqual(xpForAnswer(d, c - 1, true));
      }
  });
});

describe('REWARDS', () => {
  it('are whole, non-negative numbers', () => {
    const walk = (v: unknown): number[] => (typeof v === 'number' ? [v] : Object.values(v as object).flatMap(walk));
    for (const n of walk(REWARDS)) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  it('keep the intended order of generosity', () => {
    expect(REWARDS.perfect.xp).toBeGreaterThan(REWARDS.quizComplete.xp);
    expect(REWARDS.lesson.xp).toBeGreaterThan(REWARDS.lessonReread.xp);
    expect(REWARDS.minBonusQuestions).toBeGreaterThanOrEqual(2);
    expect(REWARDS.coinPerCorrect).toBeGreaterThan(0);
  });
});
