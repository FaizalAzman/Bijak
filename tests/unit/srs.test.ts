import type { Question } from '@/features/content/schema';
import { BOX_INTERVAL_DAYS, dueCards, MASTERED_BOX, srsUpdate, type SrsCard, type SrsContext } from '@/features/srs/srs';
import { DAY_MS } from '@/lib/date';

const q: Question = { id: 'q1', type: 'trueFalse', prompt: 'Sky is blue', lang: 'en', difficulty: 1, answer: true };
const ctx: SrsContext = { key: 'quiz::q1', quizId: 'quiz', standardId: 'std3', subjectId: 'sci', topicId: 't1', q };
const T0 = 1_750_000_000_000;

describe('srsUpdate', () => {
  it('does not track questions answered right the first time', () => {
    expect(srsUpdate(undefined, ctx, true, T0)).toBeUndefined();
  });

  it('creates a due-now card on the first mistake', () => {
    expect(srsUpdate(undefined, ctx, false, T0)).toEqual({ ...ctx, box: 0, due: T0, lapses: 1, reviews: 0, lastAt: T0 });
  });

  it('moves up one box per correct review, with growing gaps', () => {
    let card = srsUpdate(undefined, ctx, false, T0) as SrsCard;
    let now = T0;
    for (let box = 1; box < MASTERED_BOX; box++) {
      card = srsUpdate(card, ctx, true, now) as SrsCard;
      expect(card.box).toBe(box);
      expect(card.due).toBe(now + BOX_INTERVAL_DAYS[box] * DAY_MS);
      expect(card.reviews).toBe(box);
      now = card.due;
    }
    // One more correct review at the top box retires the card.
    expect(srsUpdate(card, ctx, true, now)).toBeNull();
  });

  it('drops back to box 0 on a mistake and counts the lapse', () => {
    const card: SrsCard = { ...ctx, box: 4, due: T0, lapses: 2, reviews: 7, lastAt: 0 };
    expect(srsUpdate(card, ctx, false, T0 + 5)).toMatchObject({ box: 0, due: T0 + 5, lapses: 3, reviews: 8, lastAt: T0 + 5 });
  });

  it('does not promote a card answered right before it is due (no cramming)', () => {
    const card: SrsCard = { ...ctx, box: 2, due: T0 + DAY_MS, lapses: 1, reviews: 2, lastAt: T0 - 10 };
    const next = srsUpdate(card, ctx, true, T0) as SrsCard;
    expect(next.box).toBe(2);
    expect(next.due).toBe(T0 + DAY_MS);
    expect(next.reviews).toBe(2);
    expect(next.lastAt).toBe(T0);
    // Replaying many times the same day never retires it.
    let c = next;
    for (let i = 0; i < 20; i++) c = srsUpdate(c, ctx, true, T0 + i) as SrsCard;
    expect(c).not.toBeNull();
    expect(c.box).toBe(2);
  });

  it('keeps the latest question text (content updates)', () => {
    const card: SrsCard = { ...ctx, box: 1, due: T0, lapses: 1, reviews: 1, lastAt: 0 };
    const q2 = { ...q, prompt: 'The sky is blue' } as Question;
    expect((srsUpdate(card, { ...ctx, q: q2 }, true, T0) as SrsCard).q.prompt).toBe('The sky is blue');
  });

  it('intervals grow and the mastered box is past the last interval', () => {
    BOX_INTERVAL_DAYS.forEach((d, i) => i && expect(d).toBeGreaterThan(BOX_INTERVAL_DAYS[i - 1]));
    expect(MASTERED_BOX).toBe(BOX_INTERVAL_DAYS.length);
  });
});

describe('dueCards', () => {
  const card = (key: string, due: number, lapses = 1): SrsCard => ({ ...ctx, key, box: 1, due, lapses, reviews: 1, lastAt: 0 });

  it('returns only due cards, oldest first, most-missed first on ties, up to the limit', () => {
    const cards = {
      a: card('a', T0 + 1),
      b: card('b', T0 - 100, 1),
      c: card('c', T0 - 100, 5),
      d: card('d', T0 - 500),
      e: card('e', T0),
    };
    expect(dueCards(cards, T0).map((c) => c.key)).toEqual(['d', 'c', 'b', 'e']);
    expect(dueCards(cards, T0, 2).map((c) => c.key)).toEqual(['d', 'c']);
    expect(dueCards({}, T0)).toEqual([]);
  });
});
