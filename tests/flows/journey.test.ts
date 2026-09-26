/**
 * Adam's first three weeks in Standard 3, simulated day by day through the same store
 * actions the screens use — with every invariant checked after each day.
 */
import { getContentIndex } from '@/features/content/registry';
import { minutesPerDay, weakTopics } from '@/features/insights/insights';
import { nextTopic } from '@/features/progress/selectors';
import { itemById, SHOP } from '@/features/gamify/shop';
import { levelFromXp } from '@/features/gamify/xp';
import { dueCards, MASTERED_BOX } from '@/features/srs/srs';
import { dayKey } from '@/lib/date';
import { seeded } from '@/lib/random';
import { setParentPin, verifyParentPin } from '@/lib/secure';
import { liveStreak, REVIEW_QUIZ_ID, useApp } from '@/store/app';
import { advance, advanceDays, contextFor, HOUR, playQuiz, progressOf, resetStores, setNow } from '../helpers';

import { checkInvariants } from './invariants';

const s = () => useApp.getState();

/** A review session exactly as the quiz screen runs it. */
function review() {
  const cards = dueCards(progressOf().srs, Date.now(), 10);
  if (!cards.length) return 0;
  let combo = 0;
  for (const c of cards) {
    combo++;
    s().answer({ ctx: { key: c.key, quizId: c.quizId, standardId: c.standardId, subjectId: c.subjectId, topicId: c.topicId, q: c.q }, correct: true, combo, difficulty: c.q.difficulty, review: true });
  }
  s().finishQuiz({ quizId: REVIEW_QUIZ_ID, standardId: cards[0].standardId, subjectId: cards[0].subjectId, title: 'Tricky', mode: 'review', correct: cards.length, total: cards.length, seconds: 120 });
  return cards.length;
}

it('a realistic three weeks: learning, reviewing, quests, shopping, and a sick day saved by a shield', async () => {
  setNow('2026-03-02T16:30:00'); // Monday after school
  resetStores();

  // Onboarding (what the onboarding screen does)
  s().setupFamily('Faizal');
  await setParentPin('2580');
  const adam = s().addProfile({ name: 'Adam', level: 3 });
  s().selectProfile(adam);
  expect(await verifyParentPin('2580')).toBe(true);
  expect(progressOf().quests.list).toHaveLength(3);

  const rng = seeded(2026);
  const std3 = getContentIndex().standardByLevel(3)!;
  const bought: string[] = [];
  let reviewed = 0;
  const SKIP = 9; // Adam is sick on day 9

  for (let day = 0; day < 21; day++) {
    jest.setSystemTime(new Date(2026, 2, 2 + day, 16, 30)); // after school, every day
    s().ensureToday();
    expect(progressOf().quests.day).toBe(dayKey());
    if (day === SKIP) {
      checkInvariants(`day ${day} (skipped)`);
      continue;
    }

    // 1. Continue learning: the suggested topic's lesson, then its first quiz (80% right).
    const next = nextTopic(std3, progressOf())!;
    expect(next).toBeTruthy();
    if (!progressOf().topics[next.topic.id]?.lessonDone && next.topic.lesson.length) {
      expect(s().finishLesson({ topicId: next.topic.id, seconds: 240 })?.xp).toBeGreaterThan(0);
    }
    // The first quiz in that topic not yet at 80% (the path keeps a topic open until then).
    const quiz = next.topic.quizzes.find((q) => (progressOf().topics[next.topic.id]?.best[q.id] ?? 0) < 80) ?? next.topic.quizzes[0];
    const size = quiz.generator ? (quiz.count ?? 10) : quiz.questions.length;
    playQuiz(quiz.id, Array.from({ length: size }, () => rng() < 0.8));
    advance(HOUR);

    // 2. Fix tricky questions when some are due.
    reviewed += review();

    // 3. Claim whatever quests are done.
    for (const q of progressOf().quests.list) if (q.progress >= q.target && !q.claimed) expect(s().claimQuest(q.id)).toBe(q.reward);

    // 4. Buy the cheapest item he can afford and wear it.
    const p = progressOf();
    const affordable = SHOP.filter((i) => !p.inventory.includes(i.id) && i.price <= p.coins && (!i.minLevel || levelFromXp(p.xp) >= i.minLevel)).sort((a, b) => a.price - b.price);
    if (affordable[0]) {
      expect(s().buy(affordable[0].id)).toBe(true);
      expect(s().equip(affordable[0].slot, affordable[0].id)).toBe(true);
      bought.push(affordable[0].id);
    }

    checkInvariants(`day ${day}`, { settled: true });
    // The shield earned on day 7 covers the sick day, so the streak carries on.
    expect(liveStreak(progressOf())).toBe(day < SKIP ? day + 1 : day);
  }

  const p = progressOf();
  // Streaks: 20 school days in a row — the sick day was covered by the shield from day 7.
  expect(p.streak.best).toBe(20);
  expect(p.streak.current).toBe(20);
  expect(p.streak.shielded).toEqual(['2026-03-11']);
  expect(p.streak.shields).toBe(1); // a new one earned on day 14
  expect(p.badges['streak-7']).toBeDefined();
  // He learned, reviewed and grew.
  expect(p.totals.quizzes).toBeGreaterThanOrEqual(20);
  expect(p.totals.lessons).toBeGreaterThanOrEqual(4);
  // Mastered topics are really done: every quiz at 80%+.
  const mastered = Object.entries(p.topics).filter(([, t]) => Object.values(t.best).length && Object.values(t.best).every((b) => b >= 80));
  expect(mastered.length).toBeGreaterThan(0);
  expect(reviewed).toBeGreaterThan(0);
  expect(levelFromXp(p.xp)).toBeGreaterThanOrEqual(5);
  expect(p.badges['first-quiz']).toBeDefined();
  expect(p.badges.shopper).toBeDefined();
  // Spaced repetition keeps working: nothing is stuck, promoted cards are in higher boxes.
  for (const c of Object.values(p.srs)) expect(c.box).toBeLessThan(MASTERED_BOX);
  expect(Object.values(p.srs).some((c) => c.box > 0) || Object.keys(p.srs).length === 0).toBe(true);
  // The shop: he never overspent and wears what he bought last in each slot.
  expect(bought.length).toBeGreaterThan(2);
  const avatar = s().profiles[0].avatar;
  for (const id of bought) expect(p.inventory).toContain(id);
  expect(itemById(avatar.outfit)).toBeDefined();
  // What the parent sees.
  expect(minutesPerDay(p).reduce((a, d) => a + d.value, 0)).toBeGreaterThan(0);
  expect(weakTopics(p, getContentIndex()).every((w) => w.accuracy < 80 || w.lapses > 0)).toBe(true);
  expect(p.attempts[0].at).toBeGreaterThan(p.attempts.at(-1)!.at);
});

it('a second child joining later starts fresh and never touches the first child', () => {
  setNow('2026-03-02T16:30:00');
  resetStores();
  s().setupFamily('Faizal');
  const adam = s().addProfile({ name: 'Adam', level: 3 });
  s().selectProfile(adam);
  playQuiz(getContentIndex().standardByLevel(3)!.subjects[0].topics[0].quizzes[0].id);
  const adamBefore = structuredClone(s().progress[adam]);

  const aisyah = s().addProfile({ name: 'Aisyah', level: 1 });
  s().selectProfile(aisyah);
  const std1Quiz = getContentIndex().standardByLevel(1)!.subjects.flatMap((sub) => sub.topics.flatMap((t) => t.quizzes))[0];
  playQuiz(std1Quiz.id);
  s().buy('tee-sky');
  // Her quests come from her own standard.
  const subjects = getContentIndex().standardByLevel(1)!.subjects.map((x) => x.id);
  for (const q of progressOf().quests.list) if (q.subjectId) expect(subjects).toContain(q.subjectId);

  expect(s().progress[adam]).toEqual(adamBefore);
  s().selectProfile(adam);
  checkInvariants('two children', { settled: false });
  // Removing Aisyah leaves Adam intact.
  s().removeProfile(aisyah);
  expect(s().progress[adam]).toEqual(adamBefore);
  checkInvariants('after removal');
});

it('moving up a standard switches quests to the new year from the next day', () => {
  setNow('2026-12-30T10:00:00');
  resetStores();
  s().setupFamily('Faizal');
  const id = s().addProfile({ name: 'Adam', level: 3 });
  s().selectProfile(id);
  s().updateProfile(id, { level: 4 });
  advanceDays(3); // new school year
  s().ensureToday();
  const std4 = getContentIndex().standardByLevel(4)!.subjects.map((x) => x.id);
  for (const q of progressOf().quests.list) if (q.subjectId) expect(std4).toContain(q.subjectId);
  const ctx = contextFor(getContentIndex().standardByLevel(4)!.arcade[0].quiz.id, { id: 'x', type: 'trueFalse', prompt: 'p', lang: 'en', difficulty: 1, answer: true });
  expect(ctx.standardId).toBe('std4');
});
