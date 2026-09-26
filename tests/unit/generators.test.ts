/**
 * Generated questions are checked against an independent oracle: the test re-derives
 * each answer from the prompt text alone, so a generator bug can't also hide in the check.
 */
import { generate, numericOptions } from '@/features/content/generators';
import { GeneratorSpec, Question } from '@/features/content/schema';
import { questionIssues } from '@/features/content/validate';
import { seeded } from '@/lib/random';
import { answerOf, num, oracle } from '../oracle';

const SEEDS = 150;

const SPECS: GeneratorSpec[] = [
  GeneratorSpec.parse({ kind: 'multiplication', tables: [2, 3, 4, 5, 6, 7, 8, 9], maxFactor: 12 }),
  GeneratorSpec.parse({ kind: 'division', tables: [2, 5, 9], maxFactor: 10 }),
  GeneratorSpec.parse({ kind: 'addition', max: 100 }),
  GeneratorSpec.parse({ kind: 'addition', max: 10000, terms: 3 }),
  GeneratorSpec.parse({ kind: 'subtraction', max: 1000 }),
  GeneratorSpec.parse({ kind: 'compare', max: 9999 }),
  GeneratorSpec.parse({ kind: 'placeValue', max: 99 }),
  GeneratorSpec.parse({ kind: 'placeValue', max: 9_999_999 }),
  GeneratorSpec.parse({ kind: 'money', maxRinggit: 50 }),
  GeneratorSpec.parse({ kind: 'money', maxRinggit: 1 }),
];

// Every spec again in Bahasa Melayu (Maths for non-DLP schools): the oracle reads BM prompts too.
const ALL = [...SPECS, ...SPECS.map((s) => ({ ...s, lang: 'ms' as const }))];

describe.each(ALL.map((s) => [`${s.kind} ${JSON.stringify(s).slice(0, 80)}`, s] as const))('%s', (_, spec) => {
  it.each(['numpad', 'mcq'] as const)('every %s question is valid and its answer matches the oracle', (style) => {
    for (let seed = 0; seed < SEEDS; seed++) {
      for (const q of generate(spec, 5, seeded(seed), style)) {
        expect(q.lang).toBe(spec.lang ?? 'en');
        expect(Question.safeParse(q).success).toBe(true);
        expect(questionIssues(q, q.id)).toEqual([]);
        const expected = oracle(q);
        expect(answerOf(q)).toEqual(expected);
        if (typeof expected === 'number') {
          expect(expected).toBeGreaterThanOrEqual(0);
          if (q.type === 'numpad' && q.unit !== 'RM') expect(Number.isInteger(expected)).toBe(true);
        }
        if (q.type === 'mcq') {
          const texts = q.options.map((o) => o.text);
          expect(new Set(texts).size).toBe(texts.length);
          expect(q.options.length).toBeGreaterThanOrEqual(3);
          expect(q.options.length).toBeLessThanOrEqual(4);
          for (const t of texts) if (/^[\d ]+$/.test(t ?? '')) expect(num(t!)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe('generator details', () => {
  it('ids are derived from content, so the same question always has the same SRS key', () => {
    const spec = GeneratorSpec.parse({ kind: 'multiplication', tables: [7], maxFactor: 9 });
    for (const q of generate(spec, 30, seeded(5))) expect(q.id).toBe(`mul-${q.prompt.split(' ')[0]}x${q.prompt.split(' ')[2]}`);
  });

  it('generate returns the requested count with distinct ids when the space allows', () => {
    const qs = generate(GeneratorSpec.parse({ kind: 'addition', max: 1000 }), 40, seeded(11));
    expect(qs).toHaveLength(40);
    expect(new Set(qs.map((q) => q.id)).size).toBe(40);
  });

  it('still fills the quiz when the question space is tiny (allowing repeats)', () => {
    const qs = generate(GeneratorSpec.parse({ kind: 'multiplication', tables: [1], maxFactor: 1 }), 10, seeded(1));
    expect(qs).toHaveLength(10);
    expect(new Set(qs.map((q) => q.id)).size).toBe(1);
  });

  it('money answers always have two decimals', () => {
    for (let seed = 0; seed < 100; seed++)
      for (const q of generate(GeneratorSpec.parse({ kind: 'money', maxRinggit: 20 }), 4, seeded(seed))) {
        expect(q.type).toBe('numpad');
        if (q.type === 'numpad') expect(q.answer).toMatch(/^\d+\.\d{2}$/);
      }
  });

  it('place-value numbers can reach the millions and never ask about a repeated digit', () => {
    const spec = GeneratorSpec.parse({ kind: 'placeValue', max: 9_999_999 });
    let millions = 0;
    for (let seed = 0; seed < 300; seed++)
      for (const q of generate(spec, 3, seeded(seed), 'mcq')) {
        if (q.explain?.includes('millions') || (q.type === 'mcq' && q.answer === '6')) millions++;
        oracle(q); // asserts the digit is unique
      }
    expect(millions).toBeGreaterThan(0);
  });

  it('vocab questions offer four different meanings including the right one', () => {
    const spec = GeneratorSpec.parse({
      kind: 'vocab',
      lang: 'ms',
      pairs: [
        ['besar', 'big'],
        ['kecil', 'small'],
        ['panas', 'hot'],
        ['sejuk', 'cold'],
        ['cepat', 'fast'],
      ],
    });
    for (let seed = 0; seed < 100; seed++)
      for (const q of generate(spec, 3, seeded(seed))) {
        if (q.type !== 'mcq') throw new Error('vocab must be mcq');
        const word = q.prompt.match(/"(.+)"/)![1];
        const meaning = spec.kind === 'vocab' ? spec.pairs.find(([w]) => w === word)![1] : '';
        expect(q.options.find((o) => o.id === q.answer)?.text).toBe(meaning);
        expect(new Set(q.options.map((o) => o.text)).size).toBe(4);
        expect(q.prompt.startsWith('Apakah maksud')).toBe(true);
        expect(q.lang).toBe('ms');
      }
  });
});

describe('generated questions in Bahasa Melayu', () => {
  const ms = (raw: Record<string, unknown>) => GeneratorSpec.parse({ ...raw, lang: 'ms' });

  it('use the KSSR place names and wording', () => {
    const qs = generate(ms({ kind: 'placeValue', max: 9999 }), 40, seeded(3), 'mcq');
    const places = new Set(['sa', 'puluh', 'ratus', 'ribu']);
    const placeQs = qs.filter((q) => q.prompt.startsWith('Apakah nilai tempat'));
    const valueQs = qs.filter((q) => q.prompt.startsWith('Apakah nilai digit'));
    expect(placeQs.length).toBeGreaterThan(0);
    expect(valueQs.length).toBeGreaterThan(0);
    for (const q of placeQs) if (q.type === 'mcq') for (const o of q.options) expect(places.has(o.text!)).toBe(true);
    for (const q of valueQs) expect(q.explain).toMatch(/^Digit \d berada di tempat (sa|puluh|ratus|ribu), jadi nilainya [\d ]+\.$/);
  });

  it('compare and money questions speak Bahasa Melayu', () => {
    const [cmp] = generate(ms({ kind: 'compare', max: 99 }), 1, seeded(2), 'mcq');
    expect(cmp.type === 'mcq' && cmp.options.map((o) => o.text)).toEqual(['<  lebih kecil', '=  sama', '>  lebih besar']);
    expect(cmp.explain).toMatch(/(lebih kecil daripada|sama dengan|lebih besar daripada)/);
    const change = generate(ms({ kind: 'money', maxRinggit: 50 }), 30, seeded(9)).find((q) => q.id.startsWith('money-change'));
    expect(change?.prompt).toMatch(/^Kamu ada RM[\d .]+\. Kamu belanja RM[\d .]+\. Berapakah baki wang kamu\?$/);
  });

  it('the same seed gives the same questions and answers in either language', () => {
    for (const raw of [{ kind: 'placeValue', max: 99999 }, { kind: 'money', maxRinggit: 100 }, { kind: 'compare', max: 999 }]) {
      const en = generate(GeneratorSpec.parse(raw), 20, seeded(4), 'mcq');
      const bm = generate(ms(raw), 20, seeded(4), 'mcq');
      expect(bm.map((q) => [q.id, q.type === 'mcq' || q.type === 'numpad' ? q.answer : null])).toEqual(en.map((q) => [q.id, q.type === 'mcq' || q.type === 'numpad' ? q.answer : null]));
    }
  });
});

describe('numericOptions', () => {
  it('gives four distinct whole non-negative options including the answer', () => {
    for (let seed = 0; seed < 300; seed++) {
      for (const answer of [0, 1, 2, 7, 10, 99, 1000]) {
        const { options, answer: id } = numericOptions(seeded(seed), answer, [-100, -50, 0.5, answer * 9, 3]);
        expect(options).toHaveLength(4);
        const values = options.map((o) => num(o.text));
        expect(new Set(values).size).toBe(4);
        for (const v of values) {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
        }
        expect(num(options.find((o) => o.id === id)!.text)).toBe(answer);
      }
    }
  });
});
