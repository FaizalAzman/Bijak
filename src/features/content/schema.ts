/**
 * Module 6 — KSSR Syllabus Mapping Engine (data model).
 *
 * Everything the learner sees is described by JSON payloads validated against these
 * schemas: Standard → Subject → Topic → (Lesson + Quizzes). Adding Standard 7, a new
 * subject, or a new question type only requires new JSON (and, for a new question type,
 * one renderer) — never changes to navigation or gamification code.
 */
/* eslint-disable @typescript-eslint/no-redeclare -- zod schema + inferred type share a name by design */
import { z } from 'zod';

export const Lang = z.enum(['en', 'ms']);
export type Lang = z.infer<typeof Lang>;

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'ids must be kebab-case');

/* ------------------------------------------------------------------ Lesson blocks */

export const LessonBlock = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading'), text: z.string() }),
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({
    type: z.literal('callout'),
    text: z.string(),
    emoji: z.string().optional(),
    tone: z.enum(['tip', 'remember', 'fun']).default('tip'),
  }),
  z.object({ type: z.literal('list'), items: z.array(z.string()).min(1), ordered: z.boolean().optional() }),
  z.object({ type: z.literal('math'), expr: z.string(), caption: z.string().optional() }),
  z.object({
    type: z.literal('fraction'),
    numerator: z.number().int().nonnegative(),
    denominator: z.number().int().positive(),
    caption: z.string().optional(),
  }),
  z.object({ type: z.literal('example'), title: z.string().optional(), lines: z.array(z.string()).min(1) }),
  z.object({
    type: z.literal('vocab'),
    lang: Lang.default('en'),
    items: z.array(z.object({ word: z.string(), meaning: z.string(), emoji: z.string().optional() })).min(1),
  }),
  z.object({ type: z.literal('table'), headers: z.array(z.string()), rows: z.array(z.array(z.string())) }),
  z.object({ type: z.literal('placeValue'), number: z.number().int().nonnegative() }),
  z.object({
    type: z.literal('numberLine'),
    from: z.number(),
    to: z.number(),
    step: z.number().positive(),
    highlight: z.array(z.number()).default([]),
  }),
  z.object({ type: z.literal('image'), emoji: z.string(), caption: z.string().optional() }),
  z.object({
    type: z.literal('emojiGrid'),
    emoji: z.string(),
    rows: z.number().int().positive().max(12),
    cols: z.number().int().positive().max(12),
    caption: z.string().optional(),
  }),
  z.object({ type: z.literal('say'), text: z.string(), lang: Lang.default('en') }),
]);
export type LessonBlock = z.infer<typeof LessonBlock>;

/* ------------------------------------------------------------------ Questions */

const base = {
  id,
  prompt: z.string(),
  /** Big emoji / short visual shown above the prompt. */
  visual: z.string().optional(),
  lang: Lang.default('en'),
  difficulty: z.number().int().min(1).max(3).default(1),
  explain: z.string().optional(),
  /** KSSR learning-standard code this question assesses, e.g. "1.2.1". */
  objective: z.string().optional(),
};

const Option = z.object({ id: z.string(), text: z.string().optional(), emoji: z.string().optional() });

export const Question = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('mcq'), options: z.array(Option).min(2).max(6), answer: z.string() }),
  z.object({ ...base, type: z.literal('trueFalse'), answer: z.boolean() }),
  z.object({
    ...base,
    type: z.literal('match'),
    pairs: z
      .array(z.object({ left: z.string(), right: z.string() }))
      .min(2)
      .max(5),
  }),
  z.object({ ...base, type: z.literal('order'), tokens: z.array(z.string()).min(2).max(10), distractors: z.array(z.string()).default([]) }),
  z.object({
    ...base,
    type: z.literal('sort'),
    buckets: z
      .array(z.object({ id: z.string(), label: z.string(), emoji: z.string().optional() }))
      .min(2)
      .max(3),
    items: z
      .array(z.object({ text: z.string(), bucket: z.string() }))
      .min(2)
      .max(8),
  }),
  z.object({
    ...base,
    type: z.literal('fillBlank'),
    /** Use "___" for each blank, e.g. "Ali ___ ke sekolah ___ bas." */
    text: z.string(),
    blanks: z.array(z.string()).min(1),
    bank: z.array(z.string()).min(1),
  }),
  z.object({ ...base, type: z.literal('numpad'), answer: z.string(), unit: z.string().optional() }),
]);
export type Question = z.infer<typeof Question>;
export type QuestionType = Question['type'];

/* ------------------------------------------------------------------ Generators */

export const GeneratorSpec = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('multiplication'), tables: z.array(z.number().int()).min(1), maxFactor: z.number().int().default(10) }),
  z.object({ kind: z.literal('division'), tables: z.array(z.number().int()).min(1), maxFactor: z.number().int().default(10) }),
  z.object({ kind: z.literal('addition'), max: z.number().int().positive(), terms: z.number().int().min(2).max(3).default(2) }),
  z.object({ kind: z.literal('subtraction'), max: z.number().int().positive() }),
  z.object({ kind: z.literal('compare'), max: z.number().int().positive() }),
  z.object({ kind: z.literal('placeValue'), max: z.number().int().positive() }),
  z.object({ kind: z.literal('money'), maxRinggit: z.number().int().positive() }),
  z.object({
    kind: z.literal('vocab'),
    lang: Lang.default('en'),
    /** [word, meaning] pairs; quiz asks the meaning of the word. */
    pairs: z.array(z.tuple([z.string(), z.string()])).min(4),
  }),
]);
export type GeneratorSpec = z.infer<typeof GeneratorSpec>;

/* ------------------------------------------------------------------ Quiz / Topic / Subject */

export const Quiz = z
  .object({
    id,
    title: z.string(),
    mode: z.enum(['practice', 'timeAttack']).default('practice'),
    /** Time-attack duration in seconds. */
    seconds: z.number().int().positive().default(60),
    /** Number of questions to draw (generators / large pools). */
    count: z.number().int().positive().optional(),
    shuffle: z.boolean().default(true),
    questions: z.array(Question).default([]),
    generator: GeneratorSpec.optional(),
  })
  .refine((q) => q.questions.length > 0 || q.generator, { message: 'quiz needs questions or a generator' });
export type Quiz = z.infer<typeof Quiz>;

export const Topic = z.object({
  id,
  title: z.string(),
  titleAlt: z.string().optional(),
  emoji: z.string().default('📘'),
  objectives: z.array(z.object({ code: z.string(), text: z.string() })).default([]),
  lesson: z.array(LessonBlock).default([]),
  quizzes: z.array(Quiz).default([]),
  /** Real-world activity suggested to parents when the child struggles here. */
  offlineActivity: z.string().optional(),
});
export type Topic = z.infer<typeof Topic>;

export const Subject = z.object({
  id,
  name: z.string(),
  nameAlt: z.string().optional(),
  emoji: z.string(),
  color: z.string().default('lime'),
  lang: Lang.default('en'),
  topics: z.array(Topic).default([]),
});
export type Subject = z.infer<typeof Subject>;

export const Standard = z.object({
  id,
  level: z.number().int().positive(),
  title: z.string(),
  titleAlt: z.string().optional(),
  version: z.number().int().nonnegative(),
  subjects: z.array(Subject),
  /** Arcade time-attack games; `price` > 0 means it must be unlocked in the shop. */
  arcade: z
    .array(
      z.object({
        id,
        title: z.string(),
        emoji: z.string(),
        color: z.string().default('sun'),
        price: z.number().int().nonnegative().default(0),
        subjectId: z.string(),
        quiz: Quiz,
      }),
    )
    .default([]),
});
export type Standard = z.infer<typeof Standard>;
export type ArcadeGame = Standard['arcade'][number];

export const Manifest = z.object({
  schema: z.literal(1),
  standards: z.array(z.object({ id, level: z.number().int(), version: z.number().int(), file: z.string() })),
});
export type Manifest = z.infer<typeof Manifest>;
