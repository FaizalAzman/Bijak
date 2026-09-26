/**
 * Meta tests over the whole bundled syllabus: every quiz is built many times with
 * different seeds and every resulting question is checked like authored content,
 * with generated answers re-derived independently (tests/oracle.ts). The Bahasa Melayu
 * build (Maths & Science for non-DLP schools) is checked the same way.
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { toSlides } from '@/components/lesson/LessonBlocks';
import { translatedSubjects } from '@/features/content/localize';
import { buildQuizQuestions, getContentIndex, questionKey } from '@/features/content/registry';
import { Question, type Quiz, type Standard, type Subject } from '@/features/content/schema';
import { crossStandardIssues, questionIssues, semanticIssues, translationGaps } from '@/features/content/validate';
import { seeded } from '@/lib/random';
import manifest from '../../content/manifest.json';
import { answerOf, oracle } from '../oracle';

const SEEDS = 20;
const standards = getContentIndex().standards;
const malay = getContentIndex('ms').standards;
/** Subjects each standard teaches in Bahasa Melayu for non-DLP schools. */
const translated = (std: Standard) => new Set(translatedSubjects(standards.find((s) => s.id === std.id)!, 'ms'));
const quizzes: { std: Standard; subject: Subject; quiz: Quiz; where: string }[] = [];
const collect = (std: Standard, prefix: string, keep: (subjectId: string) => boolean) => {
  for (const subject of std.subjects.filter((s) => keep(s.id)))
    for (const t of subject.topics) for (const quiz of t.quizzes) quizzes.push({ std, subject, quiz, where: `${prefix}${std.id}/${t.id}/${quiz.id}` });
  for (const g of std.arcade.filter((a) => keep(a.subjectId))) quizzes.push({ std, subject: std.subjects.find((s) => s.id === g.subjectId)!, quiz: g.quiz, where: `${prefix}${std.id}/arcade/${g.id}` });
};
for (const std of standards) collect(std, '', () => true);
for (const std of malay) collect(std, 'ms:', (id) => translated(std).has(id));

describe('syllabus', () => {
  it('bundles exactly the standards in the manifest, with matching versions and levels', () => {
    expect(standards.map((s) => [s.id, s.level, s.version])).toEqual(manifest.standards.map((m) => [m.id, m.level, m.version]));
  });

  it('covers Standard 1 to 6, one standard per level', () => {
    expect(standards.map((s) => s.level)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('passes all semantic checks, including ids unique across standards', () => {
    for (const std of [...standards, ...malay]) expect(semanticIssues(std)).toEqual([]);
    expect(crossStandardIssues(standards)).toEqual([]);
    expect(crossStandardIssues(malay)).toEqual([]);
  });

  it('every payload stays small enough to ship in the app bundle', () => {
    for (const m of manifest.standards) expect(statSync(join(__dirname, '../../content', m.file)).size).toBeLessThan(750_000);
    expect(() => JSON.parse(readFileSync(join(__dirname, '../../content/manifest.json'), 'utf8'))).not.toThrow();
  });

  it('every subject has topics, every topic has something to do, and copy is present', () => {
    for (const std of [...standards, ...malay]) {
      expect(std.title.trim()).not.toBe('');
      for (const subject of std.subjects) {
        expect(subject.topics.length).toBeGreaterThan(0);
        expect(subject.emoji).toBeTruthy();
        for (const t of subject.topics) {
          expect(t.title.trim()).not.toBe('');
          expect(t.lesson.length + t.quizzes.length).toBeGreaterThan(0);
          expect(new Set(t.objectives.map((o) => o.code)).size).toBe(t.objectives.length);
          if (t.lesson.length) expect(toSlides(t.lesson).length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('Standard 3 (the focus year) teaches all four core subjects with lessons and quizzes', () => {
    const std3 = standards.find((s) => s.level === 3)!;
    expect(std3.subjects.map((s) => s.id).sort()).toEqual(['bm', 'english', 'math', 'science']);
    for (const subject of std3.subjects) {
      expect(subject.topics.filter((t) => t.lesson.length > 0 && t.quizzes.length > 0).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('questions speak the language of their subject (voice and button labels follow it)', () => {
    for (const { subject, quiz, where } of quizzes) {
      for (const q of quiz.questions) expect(`${where}/${q.id}:${q.lang}`).toBe(`${where}/${q.id}:${subject.lang}`);
      if (quiz.generator?.kind === 'vocab') expect(`${where}:${quiz.generator.lang}`).toBe(`${where}:${subject.lang}`);
    }
  });

  it('arcade games are time attacks with an endless supply of questions', () => {
    for (const std of standards)
      for (const g of std.arcade) {
        expect(g.quiz.mode).toBe('timeAttack');
        expect(g.quiz.seconds).toBeGreaterThanOrEqual(30);
        expect(g.quiz.generator ?? (g.quiz.questions.length >= 20 ? 'enough authored' : undefined)).toBeTruthy();
      }
  });

  it('every question in the syllabus has a unique review (SRS) key', () => {
    // (The Bahasa Melayu build shares its keys with the original on purpose.)
    const keys = quizzes.filter((x) => !x.where.startsWith('ms:')).flatMap(({ quiz }) => quiz.questions.map((q) => questionKey(quiz.id, q)));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('Bahasa Melayu medium (non-DLP schools)', () => {
  const pairs = malay.map((ms) => [standards.find((s) => s.id === ms.id)!, ms] as const);

  it('teaches Maths and Science in Bahasa Melayu in every standard, with nothing left in English', () => {
    for (const [en] of pairs) {
      const core = en.subjects.filter((s) => s.id === 'math' || s.id === 'science').map((s) => s.id);
      expect(`${en.id}: ${translatedSubjects(en, 'ms').join(',')}`).toBe(`${en.id}: ${core.join(',')}`);
      expect(translationGaps(en, 'ms')).toEqual([]);
    }
  });

  it('switches only those subjects; English and Bahasa Melayu lessons stay as they are', () => {
    for (const [en, ms] of pairs) {
      for (const subject of ms.subjects) {
        const original = en.subjects.find((s) => s.id === subject.id)!;
        if (translated(ms).has(subject.id)) expect(subject).toMatchObject({ lang: 'ms', nameAlt: original.name });
        else expect(subject).toBe(original);
      }
    }
  });

  it('keeps every id and answer, so progress and reviews carry across languages', () => {
    const answerKey = (q: Question) => {
      switch (q.type) {
        case 'mcq':
        case 'trueFalse':
        case 'numpad':
          return q.answer;
        case 'order':
          return q.tokens.length;
        case 'sort':
          return q.items.map((it) => it.bucket).join();
        case 'match':
          return q.pairs.length;
        case 'fillBlank':
          return q.blanks.length;
      }
    };
    const shape = (std: Standard) =>
      std.subjects.map((s) => [s.id, s.topics.map((t) => [t.id, t.quizzes.map((qz) => [qz.id, qz.questions.map((q) => [questionKey(qz.id, q), q.type, answerKey(q)])])])]);
    for (const [en, ms] of pairs) {
      expect(shape(ms)).toEqual(shape(en));
      expect(ms.arcade.map((g) => [g.id, g.quiz.id])).toEqual(en.arcade.map((g) => [g.id, g.quiz.id]));
    }
  });

  it('generated questions have the same ids and answers in both languages (only the words change)', () => {
    for (const [en, ms] of pairs) {
      const all = (std: Standard) => [...std.subjects.flatMap((s) => s.topics.flatMap((t) => t.quizzes)), ...std.arcade.map((g) => g.quiz)].filter((q) => q.generator);
      const msQuizzes = all(ms);
      all(en).forEach((quiz, i) => {
        const a = buildQuizQuestions(quiz, seeded(7)).map((q) => [q.id, q.type === 'mcq' || q.type === 'numpad' ? q.answer : null]);
        const b = buildQuizQuestions(msQuizzes[i], seeded(7)).map((q) => [q.id, q.type === 'mcq' || q.type === 'numpad' ? q.answer : null]);
        expect(b).toEqual(a);
      });
    }
  });
});

describe.each(quizzes.map((x) => [x.where, x] as const))('%s', (_, { quiz }) => {
  it(`builds valid, answerable questions for ${SEEDS} different seeds`, () => {
    const expected = quiz.generator ? (quiz.mode === 'timeAttack' ? 80 : (quiz.count ?? 10)) : Math.min(quiz.count ?? Infinity, quiz.questions.length);
    for (let seed = 0; seed < SEEDS; seed++) {
      const qs = buildQuizQuestions(quiz, seeded(seed));
      expect(qs).toHaveLength(expected);
      if (!quiz.generator) expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
      for (const q of qs) {
        const parsed = Question.safeParse(q);
        if (!parsed.success) throw new Error(`${q.id}: ${parsed.error.message}`);
        expect(questionIssues(q, q.id)).toEqual([]);
        if (quiz.mode === 'timeAttack') expect(q.type).toBe('mcq');
        if (quiz.generator && quiz.generator.kind !== 'vocab') expect(answerOf(q)).toEqual(oracle(q));
      }
    }
  });
});
