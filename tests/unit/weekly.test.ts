/**
 * The weekly parent report: numbers that match what the child actually did this week and
 * last week, and a WhatsApp message a parent can send as is.
 */
import { getContentIndex } from '@/features/content/registry';
import { allBadges } from '@/features/gamify/badges';
import { minutesLabel, rangeLabel, shareText, weeklyReport } from '@/features/insights/weekly';
import { useApp } from '@/store/app';
import { playQuiz, progressOf, resetStores, setNow, setupChild } from '../helpers';

const s = () => useApp.getState();
const profile = () => s().profiles[0];

/** Last week: 2 quizzes on 2 days. This week: fractions mastered, time is hard, a science lesson. */
function aWeekOfLearning() {
  setNow('2026-02-24T17:00:00');
  const id = setupChild({ name: 'Adam' });
  playQuiz('s3-sci-rules-q1', [true, false, true], { seconds: 300 });
  setNow('2026-02-26T17:00:00');
  playQuiz('s3-sci-rules-q1', undefined, { seconds: 240 });
  setNow('2026-03-02T17:00:00');
  playQuiz('s3-math-fractions-q1', [true, true, true, true, true, false], { seconds: 600 });
  setNow('2026-03-03T17:00:00');
  playQuiz('s3-math-time-q1', [false, false, true, false, true], { seconds: 420 });
  setNow('2026-03-05T17:00:00');
  playQuiz('s3-math-time-q1', [false, true, false, true, false], { seconds: 360 });
  setNow('2026-03-08T19:00:00');
  s().finishLesson({ topicId: 's3-sci-teeth', seconds: 120 });
  s().setSchoolTopic(id, 'math', 's3-math-time');
  setNow('2026-03-08T20:00:00');
  return id;
}

beforeEach(() => resetStores());
afterEach(() => jest.useRealTimers());

describe('weeklyReport', () => {
  it('compares this week with last week', () => {
    const id = aWeekOfLearning();
    const r = weeklyReport(profile(), progressOf(id), getContentIndex());
    expect(r).toMatchObject({ name: 'Adam', from: '2026-03-02', to: '2026-03-08' });
    expect(r.thisWeek).toEqual({ minutes: 25, activeDays: 4, quizzes: 3, answered: 16, accuracy: 56 });
    expect(r.lastWeek).toEqual({ minutes: 9, activeDays: 2, quizzes: 2, answered: 6, accuracy: 83 });
    expect(r).toMatchObject({ streak: 1, bestStreak: 2 });
  });

  it('lists what was mastered and earned this week only', () => {
    const id = aWeekOfLearning();
    const p = progressOf(id);
    const r = weeklyReport(profile(), p, getContentIndex());
    expect(r.mastered).toEqual([{ topicId: 's3-math-fractions', title: 'Fractions, Decimals & Percent', subject: 'Mathematics', emoji: expect.any(String) }]);
    const start = new Date('2026-03-02T00:00:00').getTime();
    const thisWeek = allBadges(getContentIndex()).filter((b) => (p.badges[b.id] ?? 0) >= start);
    expect(r.badges.map((b) => b.id)).toEqual(thisWeek.sort((a, b) => p.badges[a.id] - p.badges[b.id]).map((b) => b.id));
    expect(r.badges.map((b) => b.title)).not.toContain('First Steps');
  });

  it('shows time per subject, the school topic and what to practise next', () => {
    const id = aWeekOfLearning();
    const r = weeklyReport(profile(), progressOf(id), getContentIndex());
    expect(r.subjects).toEqual([
      { subject: 'Mathematics', emoji: '🔢', minutes: 23 },
      { subject: 'Science', emoji: '🔬', minutes: 2 },
    ]);
    expect(r.atSchool).toEqual([{ subject: 'Mathematics', title: 'Time', stars: 1, mastered: false }]);
    expect(r.practise).toHaveLength(2);
    expect(r.practise[0]).toMatchObject({ title: 'Time', accuracy: 40 });
  });

  it('speaks the child’s teaching language', () => {
    const id = aWeekOfLearning();
    s().updateProfile(id, { medium: 'ms' });
    const r = weeklyReport(profile(), progressOf(id), getContentIndex('ms'));
    expect(r.mastered[0]).toMatchObject({ title: 'Pecahan, Perpuluhan dan Peratus', subject: 'Matematik' });
    expect(r.subjects[0].subject).toBe('Matematik');
    expect(r.atSchool[0]).toMatchObject({ subject: 'Matematik', title: 'Masa dan Waktu' });
  });

  it('a quiet week is all zeros, without made-up numbers', () => {
    setNow('2026-03-08T20:00:00');
    const id = setupChild({ name: 'Aina' });
    const r = weeklyReport(profile(), progressOf(id), getContentIndex());
    expect(r.thisWeek).toEqual({ minutes: 0, activeDays: 0, quizzes: 0, answered: 0, accuracy: null });
    expect(r).toMatchObject({ streak: 0, mastered: [], badges: [], subjects: [], atSchool: [], practise: [] });
  });

  it('skips topics or subjects that are no longer in the syllabus', () => {
    const id = aWeekOfLearning();
    useApp.setState((st) => {
      const p = structuredClone(st.progress[id]);
      p.topics['gone-topic'] = { answered: 1, correct: 1, lessonDone: true, best: {}, lastAt: Date.now(), masteredAt: Date.now() };
      p.days['2026-03-08'].seconds['std9/art'] = 600;
      return { progress: { ...st.progress, [id]: p } };
    });
    const r = weeklyReport(profile(), progressOf(id), getContentIndex());
    expect(r.mastered.map((m) => m.topicId)).toEqual(['s3-math-fractions']);
    expect(r.subjects).toContainEqual({ subject: 'art', emoji: '📘', minutes: 10 });
  });
});

describe('sharing', () => {
  it('writes a short WhatsApp message', () => {
    const id = aWeekOfLearning();
    const text = shareText(weeklyReport(profile(), progressOf(id), getContentIndex()));
    const lines = text.split('\n');
    expect(lines[0]).toBe('📊 *Adam’s week on Bijak* (2 Mar – 8 Mar)');
    expect(lines[1]).toBe('⏱️ 25 min over 4 days (last week: 9 min)');
    expect(lines[2]).toBe('✅ 3 quizzes · 56% correct (last week: 83%)');
    expect(lines[3]).toBe('🔥 Streak: 1 day (best 2)');
    expect(lines[4]).toBe('🏆 Mastered: Fractions, Decimals & Percent');
    expect(text).toContain('🏫 At school: Mathematics – Time ★☆☆');
    expect(text).toMatch(/💡 Practise next: Time \(Mathematics, 40% correct\)\n {3}Try at home: Give him a real clock/);
    expect(lines.at(-1)).toBe('_Sent from Bijak_');
  });

  it('a quiet week gets an encouraging line instead of zeros', () => {
    setNow('2026-03-08T20:00:00');
    const id = setupChild({ name: 'Aina' });
    expect(shareText(weeklyReport(profile(), progressOf(id), getContentIndex()))).toBe(
      ['📊 *Aina’s week on Bijak* (2 Mar – 8 Mar)', 'No learning yet this week. A few minutes a day is all it takes!', '_Sent from Bijak_'].join('\n'),
    );
  });

  it('singular words for one day and one quiz; mastered school topics say so', () => {
    setNow('2026-03-08T17:00:00');
    const id = setupChild({ name: 'Ali' });
    s().setSchoolTopic(id, 'math', 's3-math-fractions');
    playQuiz('s3-math-fractions-q1', undefined, { seconds: 60 });
    const text = shareText(weeklyReport(profile(), progressOf(id), getContentIndex()));
    expect(text).toContain('⏱️ 1 min over 1 day (last week: 0 min)');
    expect(text).toContain('✅ 1 quiz · 100% correct\n');
    expect(text).toContain('🏫 At school: Mathematics – Fractions, Decimals & Percent (mastered ✓)');
    expect(text).toContain('🎖️ New badges: ');
  });

  it('labels read naturally', () => {
    expect([0, 9, 60, 85, 125].map(minutesLabel)).toEqual(['0 min', '9 min', '1 h 0 min', '1 h 25 min', '2 h 5 min']);
    expect(rangeLabel('2026-02-23', '2026-03-01')).toBe('23 Feb – 1 Mar');
  });
});
