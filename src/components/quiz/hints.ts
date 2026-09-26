/**
 * Hints: a nudge towards the answer that never gives it away outright — two wrong options
 * disappear, the first digit or word is shown, one pair is matched. Written in the
 * question's language, like the other engine labels. A right answer after a hint is worth
 * half a point (the store enforces it), so a hint is a help, not a shortcut.
 */
import type { Question } from '@/features/content/schema';
import { hashString } from '@/lib/random';

const TEXT = {
  en: {
    or: ' or ',
    notThese: (list: string) => `It isn’t ${list}.`,
    digits: (n: number, first: string) => `It has ${n} digits and starts with ${first}.`,
    startsWith: (first: string) => `It starts with ${first}.`,
    between: (lo: number, hi: number) => `It’s between ${lo} and ${hi}.`,
    first: (word: string) => `It starts with “${word}”.`,
    firstBlank: (word: string) => `The first blank is “${word}”.`,
    pair: (left: string, right: string) => `“${left}” goes with “${right}”.`,
    sorted: (item: string, bucket: string) => `“${item}” goes in ${bucket}.`,
  },
  ms: {
    or: ' atau ',
    notThese: (list: string) => `Jawapannya bukan ${list}.`,
    digits: (n: number, first: string) => `Jawapannya ada ${n} digit dan bermula dengan ${first}.`,
    startsWith: (first: string) => `Jawapannya bermula dengan ${first}.`,
    between: (lo: number, hi: number) => `Jawapannya antara ${lo} dan ${hi}.`,
    first: (word: string) => `Ia bermula dengan “${word}”.`,
    firstBlank: (word: string) => `Tempat kosong pertama ialah “${word}”.`,
    pair: (left: string, right: string) => `“${left}” dipadankan dengan “${right}”.`,
    sorted: (item: string, bucket: string) => `“${item}” masuk ke dalam ${bucket}.`,
  },
} as const;

/** A clue for the question, or null when any clue would give the answer away (true/false, two options). */
export function hintFor(q: Question): string | null {
  const text = TEXT[q.lang];
  switch (q.type) {
    case 'mcq': {
      // Leave two choices (three when there are five or six), always including the right one.
      const wrong = q.options.filter((o) => o.id !== q.answer);
      const drop = q.options.length - (q.options.length >= 5 ? 3 : 2);
      if (drop < 1 || wrong.length < drop) return null;
      const start = hashString(`${q.id}:${q.prompt}`) % wrong.length;
      const gone = Array.from({ length: drop }, (_, i) => wrong[(start + i) % wrong.length]);
      return text.notThese(gone.map((o) => [o.emoji, o.text].filter(Boolean).join(' ')).join(text.or));
    }
    case 'numpad': {
      const digits = q.answer.replace(/\D/g, '');
      if (!digits) return null;
      if (digits.length === 1) {
        const n = Number(digits);
        const lo = Math.max(0, Math.min(n - 2, 5));
        return text.between(lo, lo + 4);
      }
      return /^\d+$/.test(q.answer.trim()) ? text.digits(digits.length, digits[0]) : text.startsWith(digits[0]);
    }
    case 'order':
      return text.first(q.tokens[0]);
    case 'fillBlank':
      return text.firstBlank(q.blanks[0]);
    case 'match':
      return text.pair(q.pairs[0].left, q.pairs[0].right);
    case 'sort': {
      const [item] = q.items;
      const bucket = q.buckets.find((b) => b.id === item.bucket);
      return bucket ? text.sorted(item.text, [bucket.emoji, bucket.label].filter(Boolean).join(' ')) : null;
    }
    case 'trueFalse':
      return null;
  }
}
