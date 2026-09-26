/**
 * Hints nudge towards the answer without giving it away, in the question's own language.
 */
import { hintFor } from '@/components/quiz/hints';
import { Question } from '@/features/content/schema';

const q = (over: object) => Question.parse({ id: 'h1', prompt: 'P', ...over });
const mcq = (n: number, answer = 'a', lang: 'en' | 'ms' = 'en') =>
  q({ type: 'mcq', lang, answer, options: Array.from({ length: n }, (_, i) => ({ id: 'abcdef'[i], text: `Option ${'abcdef'[i]}` })) });

describe('multiple choice', () => {
  it.each([
    [3, 1],
    [4, 2],
    [5, 2],
    [6, 3],
  ])('%i options: rules out %i wrong ones, never the answer', (n, ruledOut) => {
    for (const answer of 'abcdef'.slice(0, n)) {
      const hint = hintFor(mcq(n, answer))!;
      const named = [...hint.matchAll(/Option (\w)/g)].map((m) => m[1]);
      expect(named).toHaveLength(ruledOut);
      expect(new Set(named).size).toBe(ruledOut);
      expect(named).not.toContain(answer);
    }
  });

  it('two options would give it away, so there is no hint', () => {
    expect(hintFor(mcq(2))).toBeNull();
  });

  it('is the same hint every time for the same question, and reads naturally', () => {
    expect(hintFor(mcq(4, 'b'))).toBe(hintFor(mcq(4, 'b')));
    expect(hintFor(mcq(3, 'a'))).toMatch(/^It isn’t Option [bc]\.$/);
    expect(hintFor(mcq(4, 'a', 'ms'))).toMatch(/^Jawapannya bukan Option [bcd] atau Option [bcd]\.$/);
  });

  it('names emoji options by their picture and words', () => {
    const hint = hintFor(q({ type: 'mcq', answer: 'a', options: [{ id: 'a', emoji: '🐱', text: 'Cat' }, { id: 'b', emoji: '🐶' }, { id: 'c', emoji: '🐟', text: 'Fish' }] }));
    expect(['It isn’t 🐶.', 'It isn’t 🐟 Fish.']).toContain(hint);
  });
});

describe('typed numbers', () => {
  it.each([
    ['3452', 'en', 'It has 4 digits and starts with 3.'],
    ['50', 'en', 'It has 2 digits and starts with 5.'],
    ['12.50', 'en', 'It starts with 1.'],
    ['3452', 'ms', 'Jawapannya ada 4 digit dan bermula dengan 3.'],
    ['0.5', 'ms', 'Jawapannya bermula dengan 0.'],
  ] as const)('%s (%s) → %s', (answer, lang, hint) => {
    expect(hintFor(q({ type: 'numpad', answer, lang }))).toBe(hint);
  });

  it('a one-digit answer gets a range of five that holds it, never the answer alone', () => {
    for (let n = 0; n <= 9; n++) {
      const [lo, hi] = hintFor(q({ type: 'numpad', answer: String(n) }))!.match(/\d+/g)!.map(Number);
      expect(hi - lo).toBe(4);
      expect(n).toBeGreaterThanOrEqual(lo);
      expect(n).toBeLessThanOrEqual(hi);
    }
    expect(hintFor(q({ type: 'numpad', answer: '7', lang: 'ms' }))).toBe('Jawapannya antara 5 dan 9.');
  });

  it('an answer without digits has no hint', () => {
    expect(hintFor(q({ type: 'numpad', answer: '?' }))).toBeNull();
  });
});

describe('the other question types', () => {
  it('order shows where to start; fill in the blanks shows the first word', () => {
    expect(hintFor(q({ type: 'order', tokens: ['I', 'like', 'rice'] }))).toBe('It starts with “I”.');
    expect(hintFor(q({ type: 'order', lang: 'ms', tokens: ['Saya', 'suka', 'nasi'] }))).toBe('Ia bermula dengan “Saya”.');
    expect(hintFor(q({ type: 'fillBlank', text: 'Ali ___ ke sekolah ___ bas.', blanks: ['pergi', 'naik'], bank: ['pergi', 'naik'], lang: 'ms' }))).toBe('Tempat kosong pertama ialah “pergi”.');
  });

  it('match and sort place one item', () => {
    expect(hintFor(q({ type: 'match', pairs: [{ left: '🐟', right: 'Water' }, { left: '🐦', right: 'Air' }] }))).toBe('“🐟” goes with “Water”.');
    const sort = { type: 'sort', buckets: [{ id: 'l', label: 'Living', emoji: '🌱' }, { id: 'n', label: 'Non-living' }], items: [{ text: 'Cat', bucket: 'l' }, { text: 'Rock', bucket: 'n' }] };
    expect(hintFor(q(sort))).toBe('“Cat” goes in 🌱 Living.');
    expect(hintFor(q({ ...sort, lang: 'ms', buckets: [{ id: 'l', label: 'Hidup' }, { id: 'n', label: 'Bukan hidup' }] }))).toBe('“Cat” masuk ke dalam Hidup.');
  });

  it('true or false has no hint (it would be the answer)', () => {
    expect(hintFor(q({ type: 'trueFalse', answer: true }))).toBeNull();
  });

  it('a sort item in an unknown group has no hint', () => {
    expect(hintFor(q({ type: 'sort', buckets: [{ id: 'l', label: 'L' }, { id: 'n', label: 'N' }], items: [{ text: 'Cat', bucket: 'x' }, { text: 'Rock', bucket: 'n' }] }))).toBeNull();
  });
});
