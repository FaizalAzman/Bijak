/**
 * Meta tests over the whole bundled syllabus: every quiz is built many times with
 * different seeds and every resulting question is checked like authored content,
 * with generated answers re-derived independently (tests/oracle.ts).
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { toSlides } from '@/components/lesson/LessonBlocks';
import { buildQuizQuestions, getContentIndex, questionKey } from '@/features/content/registry';
import { Question, type Quiz, type Standard, type Subject } from '@/features/content/schema';
import { crossStandardIssues, questionIssues, semanticIssues } from '@/features/content/validate';
import { seeded } from '@/lib/random';
import manifest from '../../content/manifest.json';
import { answerOf, oracle } from '../oracle';

const SEEDS = 20;
const standards = getContentIndex().standards;
const quizzes: { std: Standard; subject: Subject; quiz: Quiz; where: string }[] = [];
for (const std of standards) {
  for (const subject of std.subjects) for (const t of subject.topics) for (const quiz of t.quizzes) quizzes.push({ std, subject, quiz, where: `${std.id}/${t.id}/${quiz.id}` });
  for (const g of std.arcade) quizzes.push({ std, subject: std.subjects.find((s) => s.id === g.subjectId)!, quiz: g.quiz, where: `${std.id}/arcade/${g.id}` });
}

describe('syllabus', () => {
  it('bundles exactly the standards in the manifest, with matching versions and levels', () => {
    expect(standards.map((s) => [s.id, s.level, s.version])).toEqual(manifest.standards.map((m) => [m.id, m.level, m.version]));
  });

  it('covers Standard 1 to 6, one standard per level', () => {
    expect(standards.map((s) => s.level)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('passes all semantic checks, including ids unique across standards', () => {
    for (const std of standards) expect(semanticIssues(std)).toEqual([]);
    expect(crossStandardIssues(standards)).toEqual([]);
  });

  it('every payload stays small enough to ship in the app bundle', () => {
    for (const m of manifest.standards) expect(statSync(join(__dirname, '../../content', m.file)).size).toBeLessThan(750_000);
    expect(() => JSON.parse(readFileSync(join(__dirname, '../../content/manifest.json'), 'utf8'))).not.toThrow();
  });

  it('every subject has topics, every topic has something to do, and copy is present', () => {
    for (const std of standards) {
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
    const keys = quizzes.flatMap(({ quiz }) => quiz.questions.map((q) => questionKey(quiz.id, q)));
    expect(new Set(keys).size).toBe(keys.length);
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
