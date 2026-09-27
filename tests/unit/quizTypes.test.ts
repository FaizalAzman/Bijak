import { answerLines, correctAnswerText, LABELS, numericEqual } from '@/components/quiz/types';
import type { Question } from '@/features/content/schema';

const base = { id: 'q', prompt: 'p', lang: 'en' as const, difficulty: 1 };

describe('correctAnswerText', () => {
  it('mcq shows emoji and text of the right option', () => {
    expect(correctAnswerText({ ...base, type: 'mcq', options: [{ id: 'a', text: 'Cat', emoji: '🐱' }, { id: 'b', text: 'Dog' }], answer: 'a' })).toBe('🐱 Cat');
    expect(correctAnswerText({ ...base, type: 'mcq', options: [{ id: 'a', emoji: '🐶' }, { id: 'b', text: 'Dog' }], answer: 'a' })).toBe('🐶');
  });

  it('true/false uses the question language', () => {
    expect(correctAnswerText({ ...base, type: 'trueFalse', answer: true })).toBe('True');
    expect(correctAnswerText({ ...base, lang: 'ms', type: 'trueFalse', answer: false })).toBe('Salah');
  });

  it('numpad shows units, with RM in front', () => {
    expect(correctAnswerText({ ...base, type: 'numpad', answer: '12.50', unit: 'RM' })).toBe('RM12.50');
    expect(correctAnswerText({ ...base, type: 'numpad', answer: '5', unit: 'cm' })).toBe('5 cm');
    expect(correctAnswerText({ ...base, type: 'numpad', answer: '42' })).toBe('42');
  });

  it('fill-in-the-blanks puts every answer in place', () => {
    expect(correctAnswerText({ ...base, type: 'fillBlank', text: 'Ali ___ ke sekolah ___ bas.', blanks: ['pergi', 'naik'], bank: ['pergi', 'naik'] })).toBe('Ali pergi ke sekolah naik bas.');
  });

  it('order joins the tokens; match and sort have no single answer text', () => {
    expect(correctAnswerText({ ...base, type: 'order', tokens: ['I', 'like', 'rice'], distractors: [] })).toBe('I like rice');
    expect(correctAnswerText({ ...base, type: 'match', pairs: [{ left: 'a', right: 'b' }, { left: 'c', right: 'd' }] } as Question)).toBeNull();
    expect(
      correctAnswerText({ ...base, type: 'sort', buckets: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }], items: [{ text: 'a', bucket: 'x' }, { text: 'b', bucket: 'y' }] } as Question),
    ).toBeNull();
  });
});

describe('answerLines', () => {
  it('spells out the whole answer for every question type, including match and sort', () => {
    expect(answerLines({ ...base, type: 'mcq', options: [{ id: 'a', text: 'Cat' }, { id: 'b', text: 'Dog' }], answer: 'b' })).toEqual(['Dog']);
    expect(answerLines({ ...base, type: 'trueFalse', answer: false })).toEqual(['False']);
    expect(answerLines({ ...base, type: 'numpad', answer: '7' })).toEqual(['7']);
    expect(answerLines({ ...base, type: 'order', tokens: ['I', 'like', 'rice'], distractors: ['you'] })).toEqual(['I like rice']);
    expect(answerLines({ ...base, type: 'fillBlank', text: 'A ___ says moo.', blanks: ['cow'], bank: ['cow', 'cat'] })).toEqual(['A cow says moo.']);
    expect(answerLines({ ...base, type: 'match', pairs: [{ left: '🐟', right: 'Water' }, { left: '🐦', right: 'Air' }] } as Question)).toEqual(['🐟 → Water', '🐦 → Air']);
    expect(
      answerLines({
        ...base,
        type: 'sort',
        buckets: [
          { id: 'x', label: 'Hot', emoji: '🔥' },
          { id: 'y', label: 'Cold' },
          { id: 'z', label: 'Empty' },
        ],
        items: [
          { text: 'Sun', bucket: 'x' },
          { text: 'Ice', bucket: 'y' },
          { text: 'Fire', bucket: 'x' },
        ],
      } as Question),
    ).toEqual(['🔥 Hot: Sun, Fire', 'Cold: Ice']);
  });

  it('an mcq with an unknown answer id has nothing to show', () => {
    expect(answerLines({ ...base, type: 'mcq', options: [{ id: 'a', text: 'Cat' }, { id: 'b', text: 'Dog' }], answer: 'zz' })).toEqual([]);
  });
});

describe('numericEqual', () => {
  it.each([
    ['12', '12', true],
    ['12.5', '12.50', true],
    ['012', '12', true],
    ['0.1', '0.10', true],
    ['12', '13', false],
    ['', '0', false],
    ['  ', '0', false],
    ['abc', 'abc', false],
    ['1e3', '1000', true],
  ])('numericEqual(%p, %p) = %p', (a, b, expected) => {
    expect(numericEqual(a, b)).toBe(expected);
  });
});

it('every label exists in both languages', () => {
  expect(Object.keys(LABELS.en).sort()).toEqual(Object.keys(LABELS.ms).sort());
});
