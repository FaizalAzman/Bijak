/**
 * Shared test helpers: a controllable clock, a fresh app store, and small factories so
 * tests read like the business rules they check.
 */
import { buildQuizQuestions, getContentIndex, questionKey, useContent } from '@/features/content/registry';
import type { Question, Standard } from '@/features/content/schema';
import { seeded } from '@/lib/random';
import { useApp, type AnswerInput, type FinishInput } from '@/store/app';
import type { Progress } from '@/store/types';

/* ------------------------------------------------------------------ clock */

/** Freeze the clock at a local (Asia/Kuala_Lumpur) date-time, e.g. "2026-03-02T09:00". */
export function setNow(local: string) {
  jest.useFakeTimers({ now: new Date(local), doNotFake: ['queueMicrotask', 'nextTick'] });
}

/** Move the frozen clock forward (fake timers stay installed). */
export function advance(ms: number) {
  jest.setSystemTime(Date.now() + ms);
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** Jump to the same time of day `n` days later. */
export function advanceDays(n = 1) {
  advance(n * DAY);
}

/* ------------------------------------------------------------------ app store */

/** Wipe the fake device storage (SQLite key-value store). */
export function clearDevice() {
  (jest.requireMock('expo-sqlite/kv-store') as { Storage: { clearSync: () => void } }).Storage.clearSync();
}

export function resetStores() {
  clearDevice();
  useApp.setState(useApp.getInitialState(), true);
  useContent.setState(useContent.getInitialState(), true);
}

/** Parent + one active child. Returns the child's id. */
export function setupChild(opts: { name?: string; level?: number } = {}): string {
  const s = useApp.getState();
  if (!s.parent) s.setupFamily('Parent');
  const id = useApp.getState().addProfile({ name: opts.name ?? 'Adam', level: opts.level ?? 3 });
  useApp.getState().selectProfile(id);
  return id;
}

export const progressOf = (id?: string): Progress => {
  const s = useApp.getState();
  const pid = id ?? s.activeProfileId;
  if (!pid) throw new Error('no active profile');
  return s.progress[pid];
};

/** Patch the active child's progress directly (for arranging a scenario). */
export function patchProgress(patch: Partial<Progress> | ((p: Progress) => void)) {
  const s = useApp.getState();
  const id = s.activeProfileId!;
  const next = structuredClone(s.progress[id]);
  if (typeof patch === 'function') patch(next);
  else Object.assign(next, patch);
  useApp.setState({ progress: { ...s.progress, [id]: next } });
}

/* ------------------------------------------------------------------ content */

export const index = () => getContentIndex();

/** A quiz from the bundled syllabus with at least `min` authored questions. */
export function authoredQuiz(min = 3) {
  for (const std of index().standards)
    for (const subject of std.subjects)
      for (const topic of subject.topics)
        for (const quiz of topic.quizzes) if (!quiz.generator && quiz.questions.length >= min) return { std, subject, topic, quiz };
  throw new Error('no authored quiz');
}

export function contextFor(quizId: string, q: Question): AnswerInput['ctx'] {
  const ref = index().quiz(quizId);
  if (!ref) throw new Error(`unknown quiz ${quizId}`);
  return { key: questionKey(quizId, q), quizId, standardId: ref.standard.id, subjectId: ref.subject.id, topicId: ref.topic?.id, q };
}

/**
 * Play a quiz the way the quiz screen does: one `answer` per question, then `finishQuiz`.
 * `pattern[i]` says whether question i is answered correctly (default: all correct).
 */
export function playQuiz(quizId: string, pattern?: boolean[], opts: { seconds?: number; mode?: FinishInput['mode'] } = {}) {
  const ref = index().quiz(quizId)!;
  const qs = buildQuizQuestions({ ...ref.quiz, shuffle: false }, seeded(1));
  const results = pattern ?? qs.map(() => true);
  let combo = 0;
  let xp = 0;
  const mode = opts.mode ?? ref.quiz.mode;
  results.forEach((correct, i) => {
    const q = qs[i % qs.length];
    combo = correct ? combo + 1 : 0;
    xp += useApp.getState().answer({ ctx: contextFor(quizId, q), correct, combo, difficulty: q.difficulty, review: mode === 'review', fast: mode === 'timeAttack' });
  });
  const reward = useApp.getState().finishQuiz({
    quizId,
    topicId: ref.topic?.id,
    standardId: ref.standard.id,
    subjectId: ref.subject.id,
    title: ref.quiz.title,
    mode,
    correct: results.filter(Boolean).length,
    total: results.length,
    seconds: opts.seconds ?? 60,
  });
  return { reward, answerXp: xp, questions: qs };
}

export function allStandards(): Standard[] {
  return index().standards;
}
