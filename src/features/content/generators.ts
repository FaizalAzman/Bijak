/**
 * Procedural question generators — infinite practice for maths & vocabulary.
 * Generated question ids are derived from their content, so the Spaced Repetition
 * System can track e.g. "7 × 8" across sessions exactly like authored questions.
 */
import { groupDigits } from '@/lib/format';
import { hashString, int, pick, shuffle, type Rng } from '@/lib/random';
import type { GeneratorSpec, Question } from './schema';

export type GenStyle = 'numpad' | 'mcq';

/** Kebab-case id fragment for a word ("Selamat pagi" → "selamat-pagi-1x2y3z"); the hash keeps ids unique. */
function slug(word: string): string {
  const base = word
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return [base, hashString(word).toString(36)].filter(Boolean).join('-');
}

/** Four distinct, non-negative whole-number options: the answer plus plausible mistakes. */
export function numericOptions(rng: Rng, answer: number, spread: number[]): { options: { id: string; text: string }[]; answer: string } {
  const set = new Set<number>([answer]);
  const candidates = shuffle(
    spread.map((d) => answer + d).filter((v) => Number.isInteger(v) && v >= 0 && v !== answer),
    rng,
  );
  for (const c of candidates) {
    if (set.size >= 4) break;
    set.add(c);
  }
  // Not enough plausible mistakes: fill with near neighbours (never negative).
  for (let step = 1; set.size < 4; step++) set.add(rng() < 0.5 && answer - step >= 0 ? answer - step : answer + step);
  const values = shuffle([...set], rng);
  const options = values.map((v, i) => ({ id: String.fromCharCode(97 + i), text: groupDigits(v) }));
  return { options, answer: options[values.indexOf(answer)].id };
}

function numeric(id: string, prompt: string, answer: number, style: GenStyle, rng: Rng, spread: number[], extra: Partial<Question> = {}): Question {
  if (style === 'mcq') {
    const o = numericOptions(rng, answer, spread);
    return { id, type: 'mcq', prompt, lang: 'en', difficulty: 1, options: o.options, answer: o.answer, ...extra } as Question;
  }
  return { id, type: 'numpad', prompt, lang: 'en', difficulty: 1, answer: String(answer), ...extra } as Question;
}

export const PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'];

function one(spec: GeneratorSpec, rng: Rng, style: GenStyle): Question {
  switch (spec.kind) {
    case 'multiplication': {
      const a = pick(rng, spec.tables);
      const b = int(rng, 1, spec.maxFactor);
      const [x, y] = rng() < 0.5 ? [a, b] : [b, a];
      return numeric(`mul-${x}x${y}`, `${x} × ${y} = ?`, x * y, style, rng, [a, -a, b, -b, 1, -1, 10], { difficulty: a > 5 ? 2 : 1 });
    }
    case 'division': {
      const d = pick(rng, spec.tables);
      const q = int(rng, 1, spec.maxFactor);
      return numeric(`div-${d * q}-by-${d}`, `${d * q} ÷ ${d} = ?`, q, style, rng, [1, -1, 2, -2, 3], { difficulty: d > 5 ? 2 : 1 });
    }
    case 'addition': {
      const terms = Array.from({ length: spec.terms }, () => int(rng, 1, Math.max(2, Math.floor(spec.max / spec.terms))));
      const sum = terms.reduce((s, v) => s + v, 0);
      return numeric(`add-${terms.join('-')}`, `${terms.map(groupDigits).join(' + ')} = ?`, sum, style, rng, [1, -1, 10, -10, 100, -100], {
        difficulty: spec.max > 1000 ? 2 : 1,
      });
    }
    case 'subtraction': {
      const a = int(rng, 2, spec.max);
      const b = int(rng, 1, a - 1);
      return numeric(`sub-${a}-${b}`, `${groupDigits(a)} − ${groupDigits(b)} = ?`, a - b, style, rng, [1, -1, 10, -10, 100]);
    }
    case 'compare': {
      const a = int(rng, 0, spec.max);
      // Keep numbers close so the child must compare digit by digit.
      const b = rng() < 0.15 ? a : Math.max(0, Math.min(spec.max, a + pick(rng, [-100, -10, -9, -1, 1, 9, 10, 90, 100, 900])));
      const ans = a > b ? 'gt' : a < b ? 'lt' : 'eq';
      return {
        id: `cmp-${a}-${b}`,
        type: 'mcq',
        prompt: `${groupDigits(a)}  ?  ${groupDigits(b)}`,
        lang: 'en',
        difficulty: 1,
        options: [
          { id: 'lt', text: '<  smaller' },
          { id: 'eq', text: '=  same' },
          { id: 'gt', text: '>  bigger' },
        ],
        answer: ans,
        explain: `${groupDigits(a)} is ${ans === 'gt' ? 'bigger than' : ans === 'lt' ? 'smaller than' : 'equal to'} ${groupDigits(b)}.`,
      };
    }
    case 'placeValue': {
      // Only ask about a non-zero digit that appears once: "the digit 5 in 3 535" would be ambiguous.
      const askable = (n: number) => {
        const ds = String(n).split('').reverse();
        return ds.map((_, i) => i).filter((i) => ds[i] !== '0' && ds.indexOf(ds[i]) === ds.lastIndexOf(ds[i]));
      };
      let n = int(rng, 10, spec.max);
      for (let tries = 0; tries < 50 && askable(n).length === 0; tries++) n = int(rng, 10, spec.max);
      if (askable(n).length === 0) n = 10;
      const digits = String(n).split('').reverse();
      const pos = pick(rng, askable(n));
      const digit = digits[pos];
      if (rng() < 0.5) {
        // Four places, in reading order: the right one plus three others (ids are place indexes).
        const pool = PLACES.map((_, i) => i).slice(0, Math.max(4, digits.length));
        const chosen = [pos, ...shuffle(pool.filter((i) => i !== pos), rng).slice(0, 3)].sort((a, b) => a - b);
        const options = chosen.map((i) => ({ id: String(i), text: PLACES[i] }));
        return {
          id: `pv-place-${n}-${pos}`,
          type: 'mcq',
          prompt: `What is the place value of the digit ${digit} in ${groupDigits(n)}?`,
          lang: 'en',
          difficulty: 1,
          options,
          answer: String(pos),
        };
      }
      const value = Number(digit) * 10 ** pos;
      return numeric(
        `pv-value-${n}-${pos}`,
        `What is the digit value of ${digit} in ${groupDigits(n)}?`,
        value,
        style,
        rng,
        [value * 9, Number(digit) - value, value / 10 - value],
        {
          difficulty: 2,
          explain: `${digit} is in the ${PLACES[pos]} place, so it is worth ${groupDigits(value)}.`,
        },
      );
    }
    case 'money': {
      const cents = () => pick(rng, [0, 0, 10, 20, 50, 80, 90, 5 * int(rng, 1, 19)]);
      const a = int(rng, 1, Math.floor(spec.maxRinggit / 2)) * 100 + cents();
      const b = int(rng, 1, Math.floor(spec.maxRinggit / 4)) * 100 + cents();
      const fmt = (c: number) => `RM${groupDigits((c / 100).toFixed(2))}`;
      if (rng() < 0.5) {
        return {
          id: `money-add-${a}-${b}`,
          type: 'numpad',
          prompt: `${fmt(a)} + ${fmt(b)} = RM ?`,
          lang: 'en',
          difficulty: 2,
          unit: 'RM',
          answer: ((a + b) / 100).toFixed(2),
        };
      }
      const [big, small] = a >= b ? [a, b] : [b, a];
      return {
        id: `money-change-${big}-${small}`,
        type: 'numpad',
        prompt: `You have ${fmt(big)}. You spend ${fmt(small)}. How much is left?`,
        visual: '👛',
        lang: 'en',
        difficulty: 2,
        unit: 'RM',
        answer: ((big - small) / 100).toFixed(2),
      };
    }
    case 'vocab': {
      const [word, meaning] = pick(rng, spec.pairs);
      const others = shuffle(
        spec.pairs.filter((p) => p[1] !== meaning).map((p) => p[1]),
        rng,
      ).slice(0, 3);
      const values = shuffle([meaning, ...others], rng);
      const options = values.map((v, i) => ({ id: String.fromCharCode(97 + i), text: v }));
      return {
        id: `vocab-${slug(word)}`,
        type: 'mcq',
        prompt: spec.lang === 'ms' ? `Apakah maksud "${word}"?` : `What does "${word}" mean?`,
        lang: spec.lang,
        difficulty: 1,
        options,
        answer: options[values.indexOf(meaning)].id,
      };
    }
  }
}

/** Generate `count` distinct questions (distinct by id where the space allows). */
export function generate(spec: GeneratorSpec, count: number, rng: Rng = Math.random, style: GenStyle = 'numpad'): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < count && guard++ < count * 25) {
    const q = one(spec, rng, style);
    if (seen.has(q.id) && guard < count * 20) continue;
    seen.add(q.id);
    out.push(q);
  }
  return out;
}
