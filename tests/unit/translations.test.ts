/**
 * Translation overlays: the same topics, quizzes and answers in the child's teaching
 * language (Maths & Science in Bahasa Melayu for non-DLP schools).
 */
import { localizeStandard, translatedSubjects } from '@/features/content/localize';
import { Standard, type Question } from '@/features/content/schema';
import { hasWords, parseStandard, translationGaps, translationIssues } from '@/features/content/validate';

type Json = Record<string, unknown>;

const QUESTIONS: Json[] = [
  { id: 'mcq', type: 'mcq', prompt: 'Which is biggest?', explain: 'Look at the thousands.', options: [{ id: 'a', text: 'Ones' }, { id: 'b', text: 'Tens' }, { id: 'c', emoji: '🔟' }], answer: 'b' },
  { id: 'tf', type: 'trueFalse', prompt: 'A cube has 6 faces.', answer: true },
  { id: 'num', type: 'numpad', prompt: 'How many minutes in 1 hour?', answer: '60', unit: 'minutes' },
  { id: 'match', type: 'match', prompt: 'Match.', pairs: [{ left: '1/2', right: 'one half' }, { left: '1/4', right: 'one quarter' }] },
  { id: 'order', type: 'order', prompt: 'Order the months.', tokens: ['January', 'February'], distractors: ['Monday'] },
  {
    id: 'sort',
    type: 'sort',
    prompt: 'g or kg?',
    buckets: [{ id: 'g', label: 'grams' }, { id: 'kg', label: 'kilograms' }],
    items: [{ text: 'pencil', bucket: 'g' }, { text: 'melon', bucket: 'kg' }],
  },
  { id: 'fill', type: 'fillBlank', prompt: 'Complete.', text: 'The ___ is hard.', blanks: ['enamel'], bank: ['enamel', 'pulp'] },
];

const fixture = (translations?: Json): Json => ({
  id: 'std9',
  level: 9,
  title: 'Standard 9',
  version: 1,
  subjects: [
    {
      id: 'math',
      name: 'Mathematics',
      emoji: '🔢',
      topics: [
        {
          id: 't1',
          title: 'Numbers',
          objectives: [{ code: '1.1', text: 'Count to 100' }],
          offlineActivity: 'Count the stairs.',
          lesson: [{ type: 'heading', text: 'Counting' }],
          quizzes: [
            { id: 'quiz1', title: 'Number quiz', questions: QUESTIONS },
            { id: 'gen1', title: 'Place value', generator: { kind: 'placeValue', max: 999 } },
            { id: 'vocab1', title: 'Words', generator: { kind: 'vocab', lang: 'en', pairs: [['one', 'satu'], ['two', 'dua'], ['three', 'tiga'], ['four', 'empat']] } },
          ],
        },
        { id: 't2', title: 'Shapes', quizzes: [{ id: 'quiz2', title: 'Shapes quiz', questions: [{ id: 'q1', type: 'trueFalse', prompt: 'A circle has corners.', answer: false }] }] },
      ],
    },
    {
      id: 'bm',
      name: 'Bahasa Melayu',
      emoji: '📖',
      lang: 'ms',
      topics: [{ id: 't3', title: 'Suku kata', quizzes: [{ id: 'quiz3', title: 'Gabung', questions: [{ id: 'q1', type: 'trueFalse', lang: 'ms', prompt: 'bu + ku = buku', answer: true }] }] }],
    },
  ],
  arcade: [
    { id: 'blitz', title: 'Times Blitz', emoji: '⚡', subjectId: 'math', quiz: { id: 'blitz-quiz', title: 'Times Blitz', mode: 'timeAttack', generator: { kind: 'multiplication', tables: [2] } } },
    { id: 'kata', title: 'Kata Pantas', emoji: '🔤', subjectId: 'bm', quiz: { id: 'kata-quiz', title: 'Kata', mode: 'timeAttack', generator: { kind: 'vocab', lang: 'ms', pairs: [['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h']] } } },
  ],
  ...(translations ? { translations } : {}),
});

const MS = {
  ms: {
    subjects: {
      math: {
        name: 'Matematik',
        topics: {
          t1: {
            title: 'Nombor',
            objectives: [{ code: '1.1', text: 'Membilang hingga 100' }],
            offlineActivity: 'Kira anak tangga.',
            lesson: [{ type: 'heading', text: 'Membilang' }],
            quizzes: {
              quiz1: {
                title: 'Kuiz nombor',
                questions: {
                  mcq: { prompt: 'Yang manakah paling besar?', explain: 'Lihat nilai ribu.', options: { a: 'Sa', b: 'Puluh' } },
                  tf: { prompt: 'Kubus ada 6 permukaan.' },
                  num: { prompt: 'Berapa minit dalam 1 jam?', unit: 'minit' },
                  match: { prompt: 'Padankan.', pairs: [{ left: '1/2', right: 'satu per dua' }, { left: '1/4', right: 'satu per empat' }] },
                  order: { prompt: 'Susun bulan.', tokens: ['Januari', 'Februari'], distractors: ['Isnin'] },
                  sort: { prompt: 'g atau kg?', buckets: { g: 'gram', kg: 'kilogram' }, items: ['pensel', 'tembikai'] },
                  fill: { prompt: 'Lengkapkan.', text: '___ sangat keras.', blanks: ['enamel'], bank: ['enamel', 'pulpa'] },
                },
              },
              gen1: { title: 'Nilai tempat' },
              vocab1: { title: 'Perkataan' },
            },
          },
        },
      },
    },
    arcade: { blitz: 'Kilat Sifir' },
  },
};

const parsed = (translations?: Json) => Standard.parse(fixture(translations));
const quizOf = (std: Standard, id: string) => std.subjects.flatMap((s) => s.topics.flatMap((t) => t.quizzes)).find((q) => q.id === id)!;
const questionOf = (std: Standard, id: string) => quizOf(std, 'quiz1').questions.find((q) => q.id === id)!;

describe('localizeStandard', () => {
  const base = parsed(MS);
  const ms = localizeStandard(base, 'ms');

  it('leaves a standard alone without a translation for the language', () => {
    expect(localizeStandard(base, 'en')).toBe(base);
    const plain = parsed();
    expect(localizeStandard(plain, 'ms')).toBe(plain);
    expect(translatedSubjects(plain, 'ms')).toEqual([]);
  });

  it('switches only translated subjects, keeping the original names as the alternative', () => {
    expect(translatedSubjects(base, 'ms')).toEqual(['math']);
    const math = ms.subjects.find((s) => s.id === 'math')!;
    expect(math).toMatchObject({ name: 'Matematik', nameAlt: 'Mathematics', lang: 'ms' });
    expect(ms.subjects.find((s) => s.id === 'bm')).toBe(base.subjects.find((s) => s.id === 'bm'));
    expect(ms.translations).toBe(base.translations);
  });

  it('a subject already taught in the language is never "translated" again', () => {
    const tr = { ms: { subjects: { ...MS.ms.subjects, bm: { name: 'BM', topics: {} } }, arcade: {} } };
    expect(translatedSubjects(parsed(tr), 'ms')).toEqual(['math']);
  });

  it('translates topic text and falls back to the original where nothing is given', () => {
    const [t1, t2] = ms.subjects[0].topics;
    expect(t1).toMatchObject({ title: 'Nombor', titleAlt: 'Numbers', offlineActivity: 'Kira anak tangga.', objectives: [{ code: '1.1', text: 'Membilang hingga 100' }] });
    expect(t1.lesson).toEqual([{ type: 'heading', text: 'Membilang' }]);
    // No translation for t2: its own text stays, and the question keeps its language.
    expect(t2.title).toBe('Shapes');
    expect(t2.titleAlt).toBeUndefined();
    expect(t2.quizzes[0].questions[0]).toEqual(base.subjects[0].topics[1].quizzes[0].questions[0]);
  });

  it('translates every question type without touching ids or answers', () => {
    const mcq = questionOf(ms, 'mcq') as Extract<Question, { type: 'mcq' }>;
    expect(mcq).toMatchObject({ prompt: 'Yang manakah paling besar?', explain: 'Lihat nilai ribu.', lang: 'ms', answer: 'b' });
    expect(mcq.options).toEqual([{ id: 'a', text: 'Sa' }, { id: 'b', text: 'Puluh' }, { id: 'c', emoji: '🔟' }]);
    expect(questionOf(ms, 'tf')).toMatchObject({ prompt: 'Kubus ada 6 permukaan.', answer: true, lang: 'ms' });
    expect(questionOf(ms, 'num')).toMatchObject({ prompt: 'Berapa minit dalam 1 jam?', unit: 'minit', answer: '60' });
    expect(questionOf(ms, 'match')).toMatchObject({ pairs: [{ left: '1/2', right: 'satu per dua' }, { left: '1/4', right: 'satu per empat' }] });
    expect(questionOf(ms, 'order')).toMatchObject({ tokens: ['Januari', 'Februari'], distractors: ['Isnin'] });
    expect(questionOf(ms, 'sort')).toMatchObject({
      buckets: [{ id: 'g', label: 'gram' }, { id: 'kg', label: 'kilogram' }],
      items: [{ text: 'pensel', bucket: 'g' }, { text: 'tembikai', bucket: 'kg' }],
    });
    expect(questionOf(ms, 'fill')).toMatchObject({ text: '___ sangat keras.', blanks: ['enamel'], bank: ['enamel', 'pulpa'] });
    for (const q of quizOf(ms, 'quiz1').questions) expect(q.lang).toBe('ms');
    expect(quizOf(ms, 'quiz1').questions.map((q) => q.id)).toEqual(quizOf(base, 'quiz1').questions.map((q) => q.id));
  });

  it('keeps the original text for fields left out or of the wrong size', () => {
    const tr = structuredClone(MS);
    const qs = tr.ms.subjects.math.topics.t1.quizzes.quiz1.questions as Record<string, Json>;
    qs.mcq = {};
    qs.match = { pairs: [{ left: 'x', right: 'y' }] };
    qs.order = {};
    qs.sort = { items: ['satu'] };
    qs.fill = {};
    qs.num = {};
    const ms2 = localizeStandard(parsed(tr), 'ms');
    const b = parsed();
    for (const id of ['mcq', 'match', 'order', 'sort', 'fill', 'num']) {
      const { lang, ...rest } = questionOf(ms2, id);
      const { lang: _, ...orig } = questionOf(b, id);
      expect(lang).toBe('ms');
      expect(rest).toEqual(orig);
    }
  });

  it('quizzes: titles translate, generated questions follow the language, vocab keeps its own', () => {
    expect(quizOf(ms, 'quiz1').title).toBe('Kuiz nombor');
    expect(quizOf(ms, 'gen1')).toMatchObject({ title: 'Nilai tempat', generator: { kind: 'placeValue', lang: 'ms' } });
    expect(quizOf(ms, 'vocab1')).toMatchObject({ title: 'Perkataan', generator: { kind: 'vocab', lang: 'en' } });
  });

  it('arcade games of translated subjects get the translated title and language', () => {
    const [blitz, kata] = ms.arcade;
    expect(blitz).toMatchObject({ title: 'Kilat Sifir', quiz: { title: 'Times Blitz', generator: { lang: 'ms' } } });
    expect(kata).toBe(base.arcade[1]);
    const noTitle = structuredClone(MS) as { ms: Json };
    noTitle.ms.arcade = {};
    expect(localizeStandard(parsed(noTitle), 'ms').arcade[0].title).toBe('Times Blitz');
  });
});

describe('translation validation', () => {
  const withQuestion = (id: string, text: Json) => {
    const tr = structuredClone(MS);
    (tr.ms.subjects.math.topics.t1.quizzes.quiz1.questions as Record<string, Json>)[id] = text;
    return tr;
  };

  it('accepts a translation that only rewords existing content', () => {
    expect(translationIssues(parsed(MS))).toEqual([]);
    expect(translationIssues(parsed())).toEqual([]);
    expect(() => parseStandard(fixture(MS))).not.toThrow();
  });

  it.each([
    ['an unknown subject', { ms: { subjects: { art: { topics: {} } } } }, /unknown subject "art"/],
    ['an unknown topic', { ms: { subjects: { math: { topics: { nope: {} } } } } }, /math\/nope: unknown topic/],
    ['an unknown quiz', { ms: { subjects: { math: { topics: { t1: { quizzes: { nope: {} } } } } } } }, /unknown quiz "nope"/],
    ['an unknown question', { ms: { subjects: { math: { topics: { t1: { quizzes: { quiz1: { questions: { nope: {} } } } } } } } } }, /unknown question "nope"/],
    ['an unknown arcade game', { ms: { arcade: { nope: 'Nope' } } }, /unknown arcade game "nope"/],
    ['a subject already in the language', { ms: { subjects: { bm: { topics: {} } } } }, /bm: the subject is already in "ms"/],
    ['a lesson the topic lacks', { ms: { subjects: { math: { topics: { t2: { lesson: [{ type: 'text', text: 'x' }] } } } } } }, /lesson the topic doesn't have/],
    ['a field for another question type', withQuestion('tf', { options: { a: 'x' } }), /"options" doesn't apply to a trueFalse question/],
    ['an unknown mcq option', withQuestion('mcq', { options: { z: 'x' } }), /unknown option "z"/],
    ['the wrong number of pairs', withQuestion('match', { pairs: [{ left: 'a', right: 'b' }] }), /needs 2 pairs, has 1/],
    ['an unknown sort bucket', withQuestion('sort', { buckets: { z: 'x' } }), /unknown bucket "z"/],
    ['the wrong number of sort items', withQuestion('sort', { items: ['a'] }), /needs 2 items, has 1/],
    ['the wrong number of blanks', withQuestion('fill', { text: '___ and ___', blanks: ['a', 'b'], bank: ['a', 'b'] }), /needs 1 blanks, has 2/],
    // The translated standard must pass the normal checks too.
    ['a translated answer missing from the word bank', withQuestion('fill', { blanks: ['enamel'], bank: ['pulpa', 'gusi'] }), /missing from word bank/],
    ['translated mcq options that look the same', withQuestion('mcq', { options: { a: 'Sama', b: ' Sama ' } }), /look the same/],
  ])('rejects %s', (_, translations, pattern) => {
    const std = parsed(translations as Json);
    expect(translationIssues(std).join('\n')).toMatch(pattern);
    expect(() => parseStandard(fixture(translations as Json))).toThrow(pattern);
  });

  it('lists what is still untranslated', () => {
    expect(translationGaps(parsed(MS), 'ms')).toEqual(['t2: title', 'quiz2: title', 'quiz2/q1: prompt']);
    expect(translationGaps(parsed(), 'ms')).toEqual([]);
    const sparse = { ms: { subjects: { math: { topics: { t1: { quizzes: { quiz1: { questions: { mcq: { explain: 'only the explanation' } } } } } } } }, arcade: {} } };
    const gaps = translationGaps(parsed(sparse), 'ms');
    expect(gaps).toEqual(
      expect.arrayContaining([
        'math: name',
        't1: title',
        't1: lesson',
        't1: objectives',
        't1: offlineActivity',
        'quiz1: title',
        'gen1: title',
        'arcade blitz: title',
        'quiz1/mcq: prompt',
        'quiz1/mcq: options.a',
        'quiz1/mcq: options.b',
        'quiz1/tf: prompt',
        'quiz1/num: unit',
        'quiz1/match: pairs',
        'quiz1/order: tokens',
        'quiz1/order: distractors',
        'quiz1/sort: buckets.g',
        'quiz1/sort: buckets.kg',
        'quiz1/sort: items',
        'quiz1/fill: text',
        'quiz1/fill: blanks',
        'quiz1/fill: bank',
      ]),
    );
    // Emoji-only options, given explanations and the other subject's games need nothing.
    expect(gaps).not.toContain('quiz1/mcq: options.c');
    expect(gaps).not.toContain('quiz1/mcq: explain');
    expect(gaps).not.toContain('arcade kata: title');
    expect(translationGaps(parsed(withQuestion('mcq', { prompt: 'Pilih', options: { a: 'Sa', b: 'Puluh' } })), 'ms')).toContain('quiz1/mcq: explain');
    // A translation for an unknown subject has nothing to compare against.
    expect(translationGaps(parsed({ ms: { subjects: { art: { topics: {} } } } }), 'ms')).toEqual([]);
  });

  it('knows which texts need translating: words do, numbers, symbols, emoji and units don\'t', () => {
    for (const text of ['Ones', 'squares', 'Utarid', 'one half', 'January']) expect(`${text}:${hasWords(text)}`).toBe(`${text}:true`);
    for (const text of [undefined, '', 'RM13', '30 sen', 'cm²', 'kg', 'ml', '7:15', '(3, 5)', '3/8', '🍦 RM3', '6 × 9 = 54', 'a.m.']) {
      expect(`${text}:${hasWords(text)}`).toBe(`${text}:false`);
    }
  });
});
