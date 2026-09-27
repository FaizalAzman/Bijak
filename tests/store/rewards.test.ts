/**
 * The reward economy: XP, coins, bonuses, streaks, lessons and daily quests.
 * Numbers come from REWARDS so the tests keep describing the rules if values are tuned.
 */
import type { Quest } from '@/features/gamify/quests';
import { REST_DAY_PRESETS, SHIELD } from '@/features/gamify/streak';
import { hintedXp, quizPoints, REWARDS, xpForAnswer } from '@/features/gamify/xp';
import { dayKey } from '@/lib/date';
import { liveStreak, MAX_ATTEMPTS, MAX_DAYS_KEPT, MAX_SESSION_SECONDS, useApp } from '@/store/app';
import { advance, advanceDays, contextFor, DAY, HOUR, index, MINUTE, patchProgress, playQuiz, progressOf, resetStores, setNow, setupChild } from '../helpers';

const QUIZ = 's3-math-numbers-q1'; // 8 authored questions
const TOPIC = 's3-math-numbers';
const ARCADE_QUIZ = 's3-arcade-times-quiz';
const s = () => useApp.getState();
const C = REWARDS.quizComplete;
const P = REWARDS.perfect;

const quest = (over: Partial<Quest>): Quest => ({ id: `${dayKey()}-x`, kind: 'correct', title: 'Q', emoji: '✅', target: 3, progress: 0, reward: 30, claimed: false, ...over });
const setQuests = (list: Quest[]) => patchProgress((p) => (p.quests = { day: dayKey(), list }));

beforeEach(() => {
  setNow('2026-03-02T09:00:00');
  resetStores();
  setupChild({ level: 3 });
});
afterEach(() => jest.useRealTimers());

describe('answering', () => {
  const q = () => index().quiz(QUIZ)!.quiz.questions[0];

  it('a correct answer pays XP by difficulty and combo, plus a coin', () => {
    const xp = s().answer({ ctx: contextFor(QUIZ, q()), correct: true, combo: 4, difficulty: 2, review: false });
    expect(xp).toBe(xpForAnswer(2, 4));
    const p = progressOf();
    expect(p.xp).toBe(xp);
    expect(p.coins).toBe(50 + REWARDS.coinPerCorrect);
    expect(p.totals).toMatchObject({ answered: 1, correct: 1, bestCombo: 4 });
    expect(p.days[dayKey()]).toMatchObject({ answered: 1, correct: 1 });
    expect(p.topics[TOPIC]).toMatchObject({ answered: 1, correct: 1, lastAt: Date.now() });
  });

  it('a wrong answer pays nothing and saves the question for review', () => {
    expect(s().answer({ ctx: contextFor(QUIZ, q()), correct: false, combo: 0, difficulty: 3, review: false })).toBe(0);
    const p = progressOf();
    expect(p.xp).toBe(0);
    expect(p.coins).toBe(50);
    expect(p.totals).toMatchObject({ answered: 1, correct: 0 });
    expect(p.srs[`${QUIZ}::${q().id}`]).toMatchObject({ box: 0, lapses: 1, topicId: TOPIC });
  });

  it('time-attack answers earn the small fast rate', () => {
    expect(s().answer({ ctx: contextFor(QUIZ, q()), correct: true, combo: 9, difficulty: 3, review: false, fast: true })).toBe(xpForAnswer(3, 9, true));
  });

  it('review answers count towards reviews and the review quest', () => {
    setQuests([quest({ kind: 'review', target: 3 })]);
    s().answer({ ctx: contextFor(QUIZ, q()), correct: false, combo: 0, difficulty: 1, review: false });
    s().answer({ ctx: contextFor(QUIZ, q()), correct: true, combo: 1, difficulty: 1, review: true });
    expect(progressOf().totals.reviews).toBe(1);
    expect(progressOf().quests.list[0].progress).toBe(1);
  });

  it('negative combos from a buggy caller are treated as 0', () => {
    s().answer({ ctx: contextFor(QUIZ, q()), correct: true, combo: -5, difficulty: 1, review: false });
    expect(progressOf().totals.bestCombo).toBe(0);
  });
});

describe('hints (a hinted right answer is worth half a point)', () => {
  const q = () => index().quiz(QUIZ)!.quiz.questions[0];
  const key = () => `${QUIZ}::${q().id}`;
  const finish = (over: object) => s().finishQuiz({ quizId: QUIZ, topicId: TOPIC, standardId: 'std3', subjectId: 'math', title: 'T', mode: 'practice', correct: 8, total: 8, seconds: 60, ...over });

  it(`a right answer after a hint earns 1/${REWARDS.hintDivisor} of the XP, no combo bonus and no coin, and still goes to review`, () => {
    const xp = s().answer({ ctx: contextFor(QUIZ, q()), correct: true, combo: 6, difficulty: 2, review: false, hinted: true });
    expect(xp).toBe(hintedXp(2));
    expect(xp).toBe(Math.ceil(xpForAnswer(2, 0) / REWARDS.hintDivisor));
    expect(xp).toBeLessThan(xpForAnswer(2, 6));
    const p = progressOf();
    expect(p.xp).toBe(xp);
    expect(p.coins).toBe(50);
    expect(p.totals).toMatchObject({ answered: 1, correct: 1, bestCombo: 0 });
    expect(p.srs[key()]).toMatchObject({ box: 0, due: Date.now() });
  });

  it('a hinted answer does not count towards a combo quest, nor as a fixed tricky question', () => {
    setQuests([quest({ kind: 'combo', target: 3 }), quest({ id: `${dayKey()}-y`, kind: 'review', target: 3 })]);
    s().answer({ ctx: contextFor(QUIZ, q()), correct: false, combo: 0, difficulty: 1, review: false });
    s().answer({ ctx: contextFor(QUIZ, q()), correct: true, combo: 2, difficulty: 1, review: false });
    s().answer({ ctx: contextFor(QUIZ, q()), correct: true, combo: 3, difficulty: 1, review: true, hinted: true });
    const p = progressOf();
    expect(p.quests.list.map((x) => x.progress)).toEqual([2, 0]);
    expect(p.totals.reviews).toBe(0);
    expect(p.srs[key()]).toMatchObject({ box: 0, lapses: 2 });
  });

  it('a wrong answer after a hint is simply wrong', () => {
    expect(s().answer({ ctx: contextFor(QUIZ, q()), correct: false, combo: 0, difficulty: 1, review: false, hinted: true })).toBe(0);
    expect(progressOf()).toMatchObject({ xp: 0, coins: 50, totals: expect.objectContaining({ correct: 0 }) });
  });

  it('time attacks have no hints, so the flag changes nothing there', () => {
    expect(s().answer({ ctx: contextFor(QUIZ, q()), correct: true, combo: 9, difficulty: 3, review: false, fast: true, hinted: true })).toBe(xpForAnswer(3, 9, true));
    expect(progressOf().coins).toBe(50 + REWARDS.coinPerCorrect);
  });

  it('a quiz with any hint is not perfect, and hinted answers count half in the topic score', () => {
    const r = finish({ hinted: 2 });
    expect(r.xp).toBe(C.xp);
    expect(r.coins).toBe(C.coins);
    const p = progressOf();
    expect(p.totals.perfect).toBe(0);
    expect(p.topics[TOPIC].best[QUIZ]).toBe(Math.round((quizPoints(8, 2) / 8) * 100));
    expect(quizPoints(8, 2)).toBe(7);
    expect(p.attempts[0]).toMatchObject({ correct: 8, total: 8, hinted: 2 });
    // The same quiz without hints later that day still earns its perfect bonus.
    expect(finish({}).xp).toBe(P.xp);
  });

  it('hint counts from the screen are cleaned: whole, at most the right answers, never in time attacks', () => {
    finish({ correct: 3, hinted: 99.7 });
    expect(progressOf().attempts[0].hinted).toBe(3);
    expect(progressOf().topics[TOPIC].best[QUIZ]).toBe(Math.round((quizPoints(3, 3) / 8) * 100));
    finish({ correct: 5, hinted: -2 });
    expect(progressOf().attempts[0]).not.toHaveProperty('hinted');
    s().finishQuiz({ quizId: ARCADE_QUIZ, standardId: 'std3', subjectId: 'math', title: 'T', mode: 'timeAttack', correct: 12, total: 14, seconds: 60, hinted: 5 });
    expect(progressOf().attempts[0]).not.toHaveProperty('hinted');
  });
});

describe('finishing a quiz', () => {
  it('pays the completion and perfect bonuses for a perfect first finish', () => {
    const { reward, answerXp } = playQuiz(QUIZ);
    expect(reward).toMatchObject({ xp: C.xp + P.xp, coins: C.coins + P.coins, newBest: false, streak: 1 });
    const p = progressOf();
    expect(p.xp).toBe(answerXp + C.xp + P.xp);
    expect(p.coins).toBe(50 + 8 * REWARDS.coinPerCorrect + C.coins + P.coins);
    expect(p.totals).toMatchObject({ quizzes: 1, perfect: 1, answered: 8, correct: 8 });
    expect(p.topics[TOPIC].best[QUIZ]).toBe(100);
    expect(p.attempts[0]).toMatchObject({ quizId: QUIZ, correct: 8, total: 8, seconds: 60, mode: 'practice', topicId: TOPIC });
    expect(reward.badges.map((b) => b.id)).toEqual(expect.arrayContaining(['first-quiz', 'perfect-1']));
  });

  it('replaying the same quiz the same day earns answer XP but no bonuses (no farming)', () => {
    playQuiz(QUIZ);
    const again = playQuiz(QUIZ);
    expect(again.reward).toMatchObject({ xp: 0, coins: 0 });
    expect(progressOf().totals).toMatchObject({ quizzes: 2, perfect: 1 });
    const third = playQuiz(QUIZ);
    expect(third.reward.coins).toBe(0);
  });

  it('bonuses come back the next day', () => {
    playQuiz(QUIZ);
    advanceDays(1);
    expect(playQuiz(QUIZ).reward).toMatchObject({ xp: C.xp + P.xp, coins: C.coins + P.coins });
    expect(progressOf().totals.perfect).toBe(2);
  });

  it('a retry that turns perfect still earns the perfect bonus, once', () => {
    const first = playQuiz(QUIZ, [true, true, false, true, true, true, true, true]);
    expect(first.reward).toMatchObject({ xp: C.xp, coins: C.coins });
    const retry = playQuiz(QUIZ);
    expect(retry.reward).toMatchObject({ xp: P.xp, coins: P.coins });
    expect(progressOf().totals.perfect).toBe(1);
    expect(playQuiz(QUIZ).reward).toMatchObject({ xp: 0, coins: 0 });
  });

  it('different quizzes each pay their own bonus', () => {
    playQuiz(QUIZ);
    expect(playQuiz('s3-sci-rules-q1').reward.xp).toBe(C.xp + P.xp);
  });

  it(`quizzes shorter than ${REWARDS.minBonusQuestions} questions pay no bonus and never count as perfect`, () => {
    setQuests([quest({ kind: 'perfect', target: 1 })]);
    const short = Array(REWARDS.minBonusQuestions - 1).fill(true);
    const { reward } = playQuiz(QUIZ, short);
    expect(reward).toMatchObject({ xp: 0, coins: 0 });
    expect(progressOf().totals.perfect).toBe(0);
    expect(progressOf().quests.list[0].progress).toBe(0);
    // It still counts as practice for the streak and the topic score.
    expect(progressOf().streak.current).toBe(1);
    expect(progressOf().topics[TOPIC].best[QUIZ]).toBe(100);
  });

  it(`exactly ${REWARDS.minBonusQuestions} questions is enough`, () => {
    expect(playQuiz('s3-sci-rules-q1', Array(REWARDS.minBonusQuestions).fill(true)).reward.xp).toBe(C.xp + P.xp);
  });

  it('keeps the best score per quiz, never lowering it', () => {
    playQuiz(QUIZ, [true, true, true, true, false, false, false, false]);
    expect(progressOf().topics[TOPIC].best[QUIZ]).toBe(50);
    playQuiz(QUIZ, [true, false, false, false, false, false, false, false]);
    expect(progressOf().topics[TOPIC].best[QUIZ]).toBe(50);
    playQuiz(QUIZ, [true, true, true, true, true, true, true, false]);
    expect(progressOf().topics[TOPIC].best[QUIZ]).toBe(88);
  });

  it('nothing answered (idle time attack) earns nothing and does not keep the streak', () => {
    const r = s().finishQuiz({ quizId: ARCADE_QUIZ, standardId: 'std3', subjectId: 'math', title: 'T', mode: 'timeAttack', correct: 0, total: 0, seconds: 60 });
    expect(r).toMatchObject({ xp: 0, coins: 0, newBest: false, streak: 0, badges: [], questsDone: [] });
    expect(progressOf().attempts).toEqual([]);
    expect(progressOf().totals.quizzes).toBe(0);
    expect(progressOf().streak.lastDay).toBeNull();
  });

  it('cleans up impossible input from the screen', () => {
    const r = s().finishQuiz({ quizId: QUIZ, topicId: TOPIC, standardId: 'std3', subjectId: 'math', title: 'T', mode: 'practice', correct: 12, total: 8.7, seconds: Number.NaN });
    expect(progressOf().attempts[0]).toMatchObject({ correct: 8, total: 8, seconds: 0 });
    expect(progressOf().topics[TOPIC].best[QUIZ]).toBe(100);
    expect(r.xp).toBe(C.xp + P.xp);
    s().finishQuiz({ quizId: QUIZ, topicId: TOPIC, standardId: 'std3', subjectId: 'math', title: 'T', mode: 'practice', correct: -3, total: 5, seconds: -9 });
    expect(progressOf().attempts[0]).toMatchObject({ correct: 0, total: 5, seconds: 0 });
  });

  it('caps a single sitting at an hour in the parent report', () => {
    playQuiz(QUIZ, undefined, { seconds: 5 * HOUR });
    expect(progressOf().attempts[0].seconds).toBe(MAX_SESSION_SECONDS);
    expect(progressOf().days[dayKey()].seconds['std3/math']).toBe(MAX_SESSION_SECONDS);
  });

  it(`keeps the latest ${MAX_ATTEMPTS} attempts, newest first`, () => {
    for (let i = 0; i < MAX_ATTEMPTS + 5; i++) {
      advance(MINUTE);
      playQuiz(QUIZ, [true, true, true]);
    }
    const { attempts } = progressOf();
    expect(attempts).toHaveLength(MAX_ATTEMPTS);
    expect(attempts[0].at).toBeGreaterThan(attempts[1].at);
  });

  it('review sessions pay once a day, keep topic scores untouched, and skip subject quests', () => {
    setQuests([quest({ kind: 'quizzesInSubject', subjectId: 'math', target: 1 })]);
    const r = s().finishQuiz({ quizId: 'review', standardId: 'std3', subjectId: 'math', title: 'Tricky', mode: 'review', correct: 4, total: 4, seconds: 30 });
    expect(r.xp).toBe(C.xp + P.xp);
    expect(progressOf().topics).toEqual({});
    expect(progressOf().quests.list[0].progress).toBe(0);
    expect(s().finishQuiz({ quizId: 'review', standardId: 'std3', subjectId: 'math', title: 'Tricky', mode: 'review', correct: 4, total: 4, seconds: 30 }).xp).toBe(0);
  });

  it('only remembers today’s paid bonuses', () => {
    playQuiz(QUIZ);
    advanceDays(1);
    playQuiz('s3-sci-rules-q1');
    expect(Object.values(progressOf().quizBonusDay ?? {}).every((d) => d === dayKey())).toBe(true);
    expect(progressOf().quizBonusDay?.[QUIZ]).toBeUndefined();
  });
});

describe('the syllabus decides what a quiz is worth', () => {
  it('a time attack reported as “practice” still pays time-attack rewards only', () => {
    const r = s().finishQuiz({ quizId: ARCADE_QUIZ, standardId: 'x', subjectId: 'y', title: 'T', mode: 'practice', correct: 10, total: 10, seconds: 60 });
    expect(r).toMatchObject({ newBest: true, xp: REWARDS.newBest.xp + 10 * REWARDS.timeAttackPerCorrect, coins: REWARDS.newBest.coins });
    expect(progressOf().totals.perfect).toBe(0);
    expect(progressOf().attempts[0]).toMatchObject({ mode: 'timeAttack', standardId: 'std3', subjectId: 'math' });
  });

  it('a practice quiz reported as a time attack still pays practice bonuses and records its topic', () => {
    const r = s().finishQuiz({ quizId: QUIZ, standardId: 'std3', subjectId: 'math', title: 'T', mode: 'timeAttack', correct: 8, total: 8, seconds: 60 });
    expect(r.xp).toBe(C.xp + P.xp);
    expect(progressOf().topics[TOPIC].best[QUIZ]).toBe(100);
    expect(progressOf().timeAttackBest[QUIZ]).toBeUndefined();
  });

  it('made-up quiz ids earn nothing (no inventing quizzes to farm bonuses)', () => {
    for (let i = 0; i < 5; i++) expect(s().finishQuiz({ quizId: `fake-${i}`, standardId: 'std3', subjectId: 'math', title: 'T', mode: 'practice', correct: 5, total: 5, seconds: 60 }).xp).toBe(0);
    expect(progressOf().attempts).toEqual([]);
    expect(progressOf().coins).toBe(50);
  });
});

describe('time attack', () => {
  const run = (correct: number, answered = correct) =>
    s().finishQuiz({ quizId: ARCADE_QUIZ, standardId: 'std3', subjectId: 'math', title: 'Times', mode: 'timeAttack', correct, total: answered, seconds: 60 });

  it('pays per correct answer, plus a bonus for a new best', () => {
    expect(run(12, 15)).toMatchObject({ newBest: true, xp: REWARDS.newBest.xp + 12 * REWARDS.timeAttackPerCorrect, coins: REWARDS.newBest.coins });
    expect(progressOf().timeAttackBest[ARCADE_QUIZ]).toBe(12);
    expect(run(10)).toMatchObject({ newBest: false, xp: 10 * REWARDS.timeAttackPerCorrect, coins: 0 });
    expect(run(12)).toMatchObject({ newBest: false });
    expect(run(13)).toMatchObject({ newBest: true });
    expect(progressOf().timeAttackBest[ARCADE_QUIZ]).toBe(13);
  });

  it('never pays the quiz completion bonus and counts for the time-attack quest only', () => {
    setQuests([quest({ id: 'a', kind: 'timeAttack', target: 1 }), quest({ id: 'b', kind: 'perfect', target: 1 }), quest({ id: 'c', kind: 'quizzesInSubject', subjectId: 'math', target: 1 })]);
    const r = run(20);
    expect(r.questsDone.map((q) => q.id)).toEqual(['a']);
    expect(progressOf().totals.perfect).toBe(0);
  });

  it('earns speed badges at 20 and 35', () => {
    expect(run(19).badges.map((b) => b.id)).not.toContain('speed-20');
    expect(run(20).badges.map((b) => b.id)).toContain('speed-20');
    expect(run(35).badges.map((b) => b.id)).toContain('speed-35');
  });
});

describe('streaks', () => {
  it('grow on consecutive days, not twice in one day, and restart after a gap', () => {
    expect(playQuiz(QUIZ).reward.streak).toBe(1);
    expect(playQuiz(QUIZ).reward.streak).toBe(1);
    advanceDays(1);
    expect(playQuiz(QUIZ).reward.streak).toBe(2);
    advanceDays(1);
    expect(playQuiz(QUIZ).reward.streak).toBe(3);
    advanceDays(2);
    expect(playQuiz(QUIZ).reward.streak).toBe(1);
    expect(progressOf().streak.best).toBe(3);
  });

  it('count calendar days, so 23:59 then 00:01 is two days', () => {
    setNow('2026-03-02T23:59:00');
    playQuiz(QUIZ);
    advance(2 * MINUTE);
    expect(playQuiz(QUIZ).reward.streak).toBe(2);
  });

  it('the streak shown stays alive through “yesterday” and drops to 0 after a missed day', () => {
    playQuiz(QUIZ);
    expect(liveStreak(progressOf())).toBe(1);
    advanceDays(1);
    expect(liveStreak(progressOf())).toBe(1);
    advanceDays(1);
    expect(liveStreak(progressOf())).toBe(0);
    expect(liveStreak(progressOf(), '2026-03-03')).toBe(1);
  });

  it('a finished lesson also keeps the streak', () => {
    playQuiz(QUIZ);
    advanceDays(1);
    const r = s().finishLesson({ topicId: TOPIC, seconds: 120 });
    expect(r?.streak).toBe(2);
  });

  it(`a shield is earned on day ${SHIELD.earnEvery} and silently saves a missed school day`, () => {
    let r = playQuiz(QUIZ).reward;
    for (let d = 1; d < SHIELD.earnEvery; d++) {
      advanceDays(1);
      r = playQuiz(QUIZ).reward;
    }
    expect(r).toMatchObject({ streak: SHIELD.earnEvery, shieldEarned: true });
    expect(progressOf().streak.shields).toBe(1);
    advanceDays(2); // one day missed
    expect(liveStreak(progressOf())).toBe(SHIELD.earnEvery);
    r = playQuiz(QUIZ).reward;
    expect(r.streak).toBe(SHIELD.earnEvery + 1);
    expect(progressOf().streak).toMatchObject({ shields: 0, shielded: [dayKey(new Date(Date.now() - DAY))] });
  });

  it('parent rest days never break the streak', () => {
    s().updateSettings({ restDays: [...REST_DAY_PRESETS.satSun] });
    setNow('2026-03-06T16:00:00'); // Friday
    playQuiz(QUIZ);
    setNow('2026-03-09T16:00:00'); // Monday
    expect(liveStreak(progressOf(), dayKey(), s().settings.restDays)).toBe(1);
    expect(playQuiz(QUIZ).reward.streak).toBe(2);
    s().updateSettings({ restDays: [] });
  });

  it('streak badges unlock on day 3', () => {
    playQuiz(QUIZ);
    advanceDays(1);
    playQuiz(QUIZ);
    advanceDays(1);
    expect(playQuiz(QUIZ).reward.badges.map((b) => b.id)).toContain('streak-3');
  });
});

describe('rest-day shields', () => {
  it(`cost ${SHIELD.price} coins, count as a purchase, and are capped at ${SHIELD.max}`, () => {
    patchProgress({ coins: SHIELD.price * 5 });
    expect(s().buyShield()).toBe(true);
    expect(s().buyShield()).toBe(true);
    expect(s().buyShield()).toBe(false);
    expect(progressOf()).toMatchObject({ coins: SHIELD.price * 3, streak: expect.objectContaining({ shields: SHIELD.max }) });
    expect(progressOf().totals.purchases).toBe(2);
    expect(progressOf().badges.shopper).toBeDefined();
  });

  it('cannot be bought without enough coins', () => {
    patchProgress({ coins: SHIELD.price - 1 });
    const dirty = s().dirtyAt;
    expect(s().buyShield()).toBe(false);
    expect(progressOf().streak.shields ?? 0).toBe(0);
    expect(s().dirtyAt).toBe(dirty);
  });
});

describe('lessons', () => {
  const read = (seconds = 90) => s().finishLesson({ topicId: TOPIC, seconds })!;

  it('the first read pays the lesson reward and completes the lesson quest', () => {
    setQuests([quest({ kind: 'lesson', target: 1 })]);
    const r = read();
    expect(r).toMatchObject({ xp: REWARDS.lesson.xp, coins: REWARDS.lesson.coins, streak: 1 });
    expect(r.questsDone).toHaveLength(1);
    const p = progressOf();
    expect(p.topics[TOPIC].lessonDone).toBe(true);
    expect(p.totals.lessons).toBe(1);
    expect(p.days[dayKey()].seconds['std3/math']).toBe(90);
  });

  it('re-reading pays a little XP once per day and never coins', () => {
    read();
    expect(read()).toMatchObject({ xp: 0, coins: 0 });
    advanceDays(1);
    expect(read()).toMatchObject({ xp: REWARDS.lessonReread.xp, coins: 0 });
    expect(read()).toMatchObject({ xp: 0, coins: 0 });
    expect(progressOf().totals.lessons).toBe(1);
  });

  it('unknown topics are refused, and time is filed under the topic’s real subject', () => {
    expect(s().finishLesson({ topicId: 'no-such-topic', seconds: 60 })).toBeNull();
    expect(progressOf().topics['no-such-topic']).toBeUndefined();
    s().finishLesson({ topicId: 's3-sci-teeth', seconds: 60 });
    expect(progressOf().days[dayKey()].seconds).toEqual({ 'std3/science': 60 });
  });

  it('ten different lessons earn the Bookworm badge', () => {
    const topics = index().standardByLevel(3)!.subjects.flatMap((sub) => sub.topics).slice(0, 10);
    let badges: string[] = [];
    for (const t of topics) badges = s().finishLesson({ topicId: t.id, seconds: 30 })!.badges.map((b) => b.id);
    expect(badges).toContain('bookworm');
  });
});

describe('daily quests', () => {
  it('are rolled over by the first action of a new day', () => {
    const yesterday = progressOf().quests;
    expect(yesterday.day).toBe('2026-03-02');
    advanceDays(1);
    playQuiz(QUIZ);
    expect(progressOf().quests.day).toBe('2026-03-03');
    expect(progressOf().quests.list.map((q) => q.id)).not.toEqual(yesterday.list.map((q) => q.id));
  });

  it('ensureToday rolls over without touching anything else, and is a no-op later that day', () => {
    advanceDays(1);
    const before = progressOf();
    s().ensureToday();
    const after = progressOf();
    expect(after.quests.day).toBe('2026-03-03');
    expect({ ...after, quests: null }).toEqual({ ...before, quests: null });
    const dirty = s().dirtyAt;
    s().ensureToday();
    expect(s().dirtyAt).toBe(dirty);
  });

  it('can be claimed once, only when complete', () => {
    setQuests([quest({ id: 'q1', kind: 'correct', target: 2, reward: 30 })]);
    expect(s().claimQuest('q1')).toBe(0);
    playQuiz(QUIZ, [true, true, false]);
    expect(s().claimQuest('q1')).toBe(30);
    expect(s().claimQuest('q1')).toBe(0);
    expect(s().claimQuest('nope')).toBe(0);
    expect(progressOf().quests.list[0].claimed).toBe(true);
  });

  it('quests finished mid-quiz by answers are announced when the quiz ends, exactly once', () => {
    setQuests([quest({ id: 'x', kind: 'correct', target: 2 }), quest({ id: 'y', kind: 'lesson', target: 1 })]);
    const r = playQuiz(QUIZ, [true, true, true]);
    expect(r.reward.questsDone.map((q) => q.id)).toEqual(['x']);
    expect(playQuiz(QUIZ, [true, true, true]).reward.questsDone).toEqual([]);
    expect(s().finishLesson({ topicId: TOPIC, seconds: 5 })!.questsDone.map((q) => q.id)).toEqual(['y']);
  });

  it('claimed quests are not announced again', () => {
    setQuests([quest({ id: 'x', kind: 'correct', target: 1 })]);
    s().answer({ ctx: contextFor(QUIZ, index().quiz(QUIZ)!.quiz.questions[0]), correct: true, combo: 1, difficulty: 1, review: false });
    s().claimQuest('x');
    expect(playQuiz(QUIZ, [true, true, true]).reward.questsDone).toEqual([]);
  });

  it('yesterday’s unclaimed quests disappear at rollover', () => {
    setQuests([quest({ id: '2026-03-02-0', kind: 'correct', target: 1, progress: 1 })]);
    advanceDays(1);
    s().ensureToday();
    expect(s().claimQuest('2026-03-02-0')).toBe(0);
  });
});

describe('housekeeping', () => {
  it(`keeps at most ${MAX_DAYS_KEPT} days of daily stats, dropping the oldest`, () => {
    for (let d = 0; d < MAX_DAYS_KEPT + 10; d++) {
      playQuiz(QUIZ, [true]);
      advance(DAY);
    }
    const days = Object.keys(progressOf().days).sort();
    expect(days).toHaveLength(MAX_DAYS_KEPT);
    expect(days.at(-1)).toBe(dayKey(new Date(Date.now() - DAY)));
  });

  it('a refused action does not mark the data as changed (no pointless sync)', () => {
    const dirty = s().dirtyAt;
    expect(s().buy('crown')).toBe(false);
    expect(s().claimQuest('nope')).toBe(0);
    expect(s().dirtyAt).toBe(dirty);
  });

  it('every change gets a strictly newer revision, even within one millisecond', () => {
    const seen: number[] = [];
    for (let i = 0; i < 5; i++) {
      playQuiz(QUIZ, [true]);
      seen.push(s().dirtyAt);
    }
    seen.forEach((v, i) => i && expect(v).toBeGreaterThan(seen[i - 1]));
  });
});
