/**
 * Economy guardrails: honest effort is rewarded at a steady pace, and nothing can be
 * farmed by repetition. The pacing bounds document the intended game design — if a
 * reward change moves them, that is a design decision, not an accident.
 */
import { getContentIndex } from '@/features/content/registry';
import { SHOP } from '@/features/gamify/shop';
import { levelFromXp, REWARDS } from '@/features/gamify/xp';
import { seeded } from '@/lib/random';
import { useApp } from '@/store/app';
import { advance, advanceDays, MINUTE, playQuiz, progressOf, resetStores, setNow, setupChild } from '../helpers';
import { checkInvariants } from './invariants';

const s = () => useApp.getState();
const QUIZ = 's3-sci-rules-q1'; // 3 questions — the shortest quiz that pays bonuses
const std3 = () => getContentIndex().standardByLevel(3)!;

beforeEach(() => {
  setNow('2026-03-02T16:00:00');
  resetStores();
  setupChild({ level: 3 });
});
afterEach(() => jest.useRealTimers());

describe('no farming', () => {
  it('replaying a short quiz 100 times in a day pays bonuses once; the rest is per correct answer', () => {
    const start = progressOf().coins;
    for (let i = 0; i < 100; i++) {
      advance(MINUTE);
      playQuiz(QUIZ);
    }
    const bonus = REWARDS.quizComplete.coins + REWARDS.perfect.coins;
    expect(progressOf().coins - start).toBe(100 * 3 * REWARDS.coinPerCorrect + bonus);
    expect(progressOf().totals.perfect).toBe(1);
  });

  it('re-reading lessons all day pays nothing after the first read', () => {
    const topic = std3().subjects[0].topics[0].id;
    let xp = 0;
    for (let i = 0; i < 50; i++) xp += s().finishLesson({ topicId: topic, seconds: 30 })!.xp;
    expect(xp).toBe(REWARDS.lesson.xp);
    advanceDays(1);
    for (let i = 0; i < 50; i++) xp += s().finishLesson({ topicId: topic, seconds: 30 })!.xp;
    expect(xp).toBe(REWARDS.lesson.xp + REWARDS.lessonReread.xp);
  });

  it('repeating the same time-attack score never pays the new-best bonus twice', () => {
    const quiz = std3().arcade[0].quiz.id;
    const run = () => s().finishQuiz({ quizId: quiz, standardId: 'std3', subjectId: 'math', title: 'T', mode: 'timeAttack', correct: 15, total: 15, seconds: 60 });
    const bonuses = Array.from({ length: 20 }, run).filter((r) => r.newBest).length;
    expect(bonuses).toBe(1);
  });

  it('quests pay once, and a new set arrives each day', () => {
    advanceDays(1);
    s().ensureToday();
    const [q] = progressOf().quests.list;
    useApp.setState((st) => {
      const id = st.activeProfileId!;
      const p = st.progress[id];
      return { progress: { ...st.progress, [id]: { ...p, quests: { ...p.quests, list: p.quests.list.map((x) => (x.id === q.id ? { ...x, progress: x.target } : x)) } } } };
    });
    expect(s().claimQuest(q.id)).toBe(q.reward);
    for (let i = 0; i < 10; i++) expect(s().claimQuest(q.id)).toBe(0);
    advanceDays(1);
    s().ensureToday();
    expect(progressOf().quests.list.every((x) => !x.claimed && x.progress === 0)).toBe(true);
  });

  it('answering without ever finishing does not keep a streak', () => {
    playQuiz(QUIZ);
    for (let d = 0; d < 3; d++) {
      advanceDays(1);
      const q = getContentIndex().quiz(QUIZ)!.quiz.questions[0];
      s().answer({ ctx: { key: `${QUIZ}::${q.id}`, quizId: QUIZ, standardId: 'std3', subjectId: 'science', q }, correct: true, combo: 1, difficulty: 1, review: false });
    }
    expect(progressOf().streak.current).toBe(1);
    expect(progressOf().streak.lastDay).toBe('2026-03-02');
  });
});

describe('pacing for an honest, diligent learner', () => {
  /** 3 quizzes and a lesson every day after school, ~80% right, claiming quests; no spending. */
  function simulate(days: number) {
    const rng = seeded(7);
    const quizzes = std3().subjects.flatMap((sub) => sub.topics.flatMap((t) => t.quizzes));
    const topics = std3().subjects.flatMap((sub) => sub.topics);
    const log: { level: number; coins: number }[] = [];
    for (let day = 0; day < days; day++) {
      jest.setSystemTime(new Date(2026, 2, 2 + day, 16, 0));
      s().ensureToday();
      s().finishLesson({ topicId: topics[day % topics.length].id, seconds: 200 });
      for (let k = 0; k < 3; k++) {
        const quiz = quizzes[(day * 3 + k) % quizzes.length];
        const size = quiz.generator ? (quiz.count ?? 10) : quiz.questions.length;
        playQuiz(quiz.id, Array.from({ length: size }, () => rng() < 0.8));
      }
      for (const q of progressOf().quests.list) if (q.progress >= q.target && !q.claimed) s().claimQuest(q.id);
      checkInvariants(`day ${day}`, { settled: true });
      log.push({ level: levelFromXp(progressOf().xp), coins: progressOf().coins });
    }
    return log;
  }

  it('levels up steadily: a few levels in the first week, double digits within a month', () => {
    const log = simulate(30);
    expect(log[6].level).toBeGreaterThanOrEqual(4);
    expect(log[6].level).toBeLessThanOrEqual(8);
    expect(log[29].level).toBeGreaterThanOrEqual(9);
    expect(log[29].level).toBeLessThanOrEqual(16);
    log.forEach((d, i) => i && expect(d.level).toBeGreaterThanOrEqual(log[i - 1].level));
  });

  it('earns a first treat on day one, most of the shop in a month, but not everything', () => {
    const log = simulate(30);
    const cheapest = Math.min(...SHOP.filter((i) => i.price > 0).map((i) => i.price));
    const everything = SHOP.reduce((n, i) => n + i.price, 0) + std3().arcade.reduce((n, g) => n + g.price, 0);
    expect(log[0].coins).toBeGreaterThanOrEqual(cheapest);
    expect(log[29].coins).toBeGreaterThan(everything * 0.4);
    expect(log[29].coins).toBeLessThan(everything);
  });

  it('every level-locked item becomes reachable within about a month', () => {
    const log = simulate(30);
    const highestLock = Math.max(...SHOP.map((i) => i.minLevel ?? 0));
    expect(log[29].level).toBeGreaterThanOrEqual(highestLock);
  });
});
