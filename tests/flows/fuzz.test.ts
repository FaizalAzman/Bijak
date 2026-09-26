/**
 * Property-based fuzzing of the whole store: seeded random sequences of child and parent
 * actions — including garbage input a buggy screen might send — with every business
 * invariant checked after every step, plus "things that may only ever go up".
 */
import { buildQuizQuestions, getContentIndex } from '@/features/content/registry';
import type { Question } from '@/features/content/schema';
import { EYES, HAIR_COLORS, HAIR_STYLES, SHOP, SKIN_TONES, type Slot } from '@/features/gamify/shop';
import { REST_DAY_PRESETS } from '@/features/gamify/streak';
import { int, pick, seeded, type Rng } from '@/lib/random';
import { REVIEW_QUIZ_ID, useApp } from '@/store/app';
import type { Progress } from '@/store/types';
import { advance, contextFor, DAY, HOUR, MINUTE, resetStores, setNow, setupChild } from '../helpers';
import { checkInvariants } from './invariants';

const RUNS = 12;
const STEPS = 500;

const index = getContentIndex();
const quizzes = index.standards.flatMap((s) => [...s.subjects.flatMap((sub) => sub.topics.flatMap((t) => t.quizzes)), ...s.arcade.map((g) => g.quiz)]);
const topics = index.standards.flatMap((s) => s.subjects.flatMap((sub) => sub.topics));
const games = index.standards.flatMap((s) => s.arcade);
const questionCache = new Map<string, Question[]>();
const questionsOf = (quizId: string, rng: Rng) => {
  if (!questionCache.has(quizId)) questionCache.set(quizId, buildQuizQuestions(quizzes.find((q) => q.id === quizId)!, rng).slice(0, 10));
  return questionCache.get(quizId)!;
};
const junk = (rng: Rng) => pick(rng, [Number.NaN, -3, 2.5, 1e9, Number.POSITIVE_INFINITY, 0]);
const SLOTS: Slot[] = ['outfit', 'hat', 'glasses', 'bg', 'pet'];

type Snapshot = Pick<Progress, 'xp' | 'totals' | 'badges' | 'inventory' | 'timeAttackBest'> & { bestStreak: number; bests: Record<string, number>; coins: number };
const snap = (p: Progress): Snapshot => ({
  xp: p.xp,
  coins: p.coins,
  totals: { ...p.totals },
  badges: { ...p.badges },
  inventory: [...p.inventory],
  timeAttackBest: { ...p.timeAttackBest },
  bestStreak: p.streak.best,
  bests: Object.fromEntries(Object.entries(p.topics).flatMap(([t, st]) => Object.entries(st.best).map(([q, b]) => [`${t}/${q}`, b]))),
});

function checkMonotonic(before: Snapshot, after: Snapshot, spent: boolean, where: string) {
  const at = (what: string) => `${where}: ${what}`;
  expect([at('xp'), after.xp >= before.xp]).toEqual([at('xp'), true]);
  for (const k of Object.keys(before.totals) as (keyof Progress['totals'])[]) expect([at(k), after.totals[k] >= before.totals[k]]).toEqual([at(k), true]);
  for (const id of Object.keys(before.badges)) expect([at(`badge ${id}`), id in after.badges]).toEqual([at(`badge ${id}`), true]);
  for (const id of before.inventory) expect([at(`item ${id}`), after.inventory.includes(id)]).toEqual([at(`item ${id}`), true]);
  for (const [k, v] of Object.entries(before.timeAttackBest)) expect([at(`best ${k}`), (after.timeAttackBest[k] ?? 0) >= v]).toEqual([at(`best ${k}`), true]);
  for (const [k, v] of Object.entries(before.bests)) expect([at(`score ${k}`), (after.bests[k] ?? 0) >= v]).toEqual([at(`score ${k}`), true]);
  expect([at('best streak'), after.bestStreak >= before.bestStreak]).toEqual([at('best streak'), true]);
  // Coins only go down by spending in the shop.
  if (!spent) expect([at('coins'), after.coins >= before.coins]).toEqual([at('coins'), true]);
}

describe.each(Array.from({ length: RUNS }, (_, i) => [i]))('random run %i', (seed) => {
  it(`keeps every invariant for ${STEPS} random actions`, () => {
    setNow('2026-01-05T08:00:00');
    resetStores();
    setupChild({ name: 'Adam', level: 3 });
    const rng = seeded(1000 + seed);
    const s = () => useApp.getState();

    for (let step = 0; step < STEPS; step++) {
      const active = s().activeProfileId!;
      const before = snap(s().progress[active]);
      let spent = false;
      let settled = false;
      let resetOrSwitched = false;
      const roll = rng();
      let name = '';

      if (roll < 0.3) {
        name = 'answer';
        const quiz = pick(rng, quizzes);
        const q = pick(rng, questionsOf(quiz.id, rng));
        s().answer({ ctx: contextFor(quiz.id, q), correct: rng() < 0.7, combo: int(rng, -1, 12), difficulty: q.difficulty, review: rng() < 0.1, fast: rng() < 0.1 });
      } else if (roll < 0.42) {
        name = 'finishQuiz';
        const quizId = rng() < 0.1 ? REVIEW_QUIZ_ID : rng() < 0.05 ? 'made-up-quiz' : pick(rng, quizzes).id;
        const total = rng() < 0.1 ? junk(rng) : int(rng, 0, 12);
        const correct = rng() < 0.1 ? junk(rng) : int(rng, -1, 14);
        s().finishQuiz({ quizId, standardId: 'std3', subjectId: 'math', title: 'Fuzz', mode: pick(rng, ['practice', 'timeAttack', 'review'] as const), correct, total, seconds: rng() < 0.1 ? junk(rng) : int(rng, 0, 900) });
        // Ignored finishes (nothing answered, unknown quiz) change nothing; counted ones award badges.
        settled = s().progress[active].totals.quizzes > before.totals.quizzes;
      } else if (roll < 0.5) {
        name = 'finishLesson';
        settled = s().finishLesson({ topicId: rng() < 0.05 ? 'ghost-topic' : pick(rng, topics).id, seconds: int(rng, 0, 600) }) !== null;
      } else if (roll < 0.55) {
        name = 'claimQuest';
        const list = s().progress[active].quests.list;
        s().claimQuest(list.length && rng() < 0.8 ? pick(rng, list).id : 'nope');
      } else if (roll < 0.62) {
        name = 'buy';
        spent = true;
        settled = s().buy(rng() < 0.9 ? pick(rng, SHOP).id : 'arcade:hack');
      } else if (roll < 0.635) {
        name = 'buyShield';
        spent = true;
        s().buyShield();
      } else if (roll < 0.65) {
        name = 'unlockArcade';
        spent = true;
        settled = s().unlockArcade(rng() < 0.9 ? pick(rng, games).id : 'ghost');
      } else if (roll < 0.71) {
        name = 'equip';
        const slot = pick(rng, SLOTS);
        s().equip(slot, rng() < 0.2 ? undefined : pick(rng, SHOP).id);
      } else if (roll < 0.74) {
        name = 'setAvatar';
        s().setAvatar(
          pick(rng, [
            { skin: pick(rng, SKIN_TONES) },
            { hair: pick(rng, HAIR_STYLES) },
            { hairColor: pick(rng, HAIR_COLORS) },
            { eyes: pick(rng, EYES) },
            { eyes: 'laser' as never },
            { skin: '#123456' },
          ]),
        );
      } else if (roll < 0.86) {
        name = 'time passes';
        advance(pick(rng, [MINUTE, 20 * MINUTE, 3 * HOUR, DAY, 2 * DAY, 3 * DAY]));
      } else if (roll < 0.9) {
        name = 'ensureToday';
        s().ensureToday();
      } else if (roll < 0.94) {
        name = 'switch child';
        if (s().profiles.length < 3 && rng() < 0.5) s().addProfile({ name: `Kid ${step}`, level: int(rng, 1, 6) });
        s().selectProfile(pick(rng, s().profiles).id);
        resetOrSwitched = true;
      } else if (roll < 0.95) {
        name = 'parent resets progress';
        s().resetProgress(active);
        resetOrSwitched = true;
      } else if (roll < 0.96) {
        name = 'change standard';
        s().updateProfile(active, { level: int(rng, 1, 6) });
      } else if (roll < 0.97) {
        name = 'parent changes rest days';
        s().updateSettings({ restDays: [...pick(rng, Object.values(REST_DAY_PRESETS))] });
      } else if (roll < 0.99) {
        name = 'parent pins a school topic';
        const level = s().profiles.find((p) => p.id === active)!.level;
        const subject = pick(rng, index.standardByLevel(level)?.subjects ?? []);
        const r = rng();
        // Mostly real topics, sometimes "Not sure", a topic from elsewhere, or a child that doesn't exist.
        const topicId = r < 0.2 ? null : r < 0.35 ? pick(rng, topics).id : subject ? pick(rng, subject.topics).id : 'none';
        const ok = s().setSchoolTopic(r > 0.97 ? 'ghost' : active, subject?.id ?? 'math', topicId);
        if (ok) expect(s().profiles.find((p) => p.id === active)!.schoolTopics?.[subject!.id]).toBe(topicId ?? undefined);
      } else {
        name = 'parent changes the teaching language';
        s().updateProfile(active, { medium: pick(rng, ['en', 'ms'] as const) });
      }

      const where = `seed ${seed} step ${step} (${name})`;
      checkInvariants(where, { settled });
      if (!resetOrSwitched) checkMonotonic(before, snap(s().progress[active]), spent, where);
    }
  });
});
