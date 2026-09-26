/**
 * Matching the school: each child's Maths & Science teaching language (DLP English or
 * Bahasa Melayu) and the topics the class is on this week, as set by a parent.
 */
import { getContentIndex } from '@/features/content/registry';
import { REVIEW_QUIZ_ID, useApp } from '@/store/app';
import { advanceDays, playQuiz, progressOf, resetStores, setNow, setupChild } from '../helpers';

beforeEach(() => {
  setNow('2026-03-02T09:00:00');
  resetStores();
});
afterEach(() => jest.useRealTimers());

const s = () => useApp.getState();
const profile = (id: string) => s().profiles.find((p) => p.id === id)!;

describe('teaching language (medium)', () => {
  it('defaults to English (DLP) and can be Bahasa Melayu', () => {
    s().setupFamily('Parent');
    const adam = s().addProfile({ name: 'Adam', level: 3 });
    const aina = s().addProfile({ name: 'Aina', level: 2, medium: 'ms' });
    expect(profile(adam).medium).toBe('en');
    expect(profile(aina).medium).toBe('ms');
  });

  it('refuses a language the app does not teach, adding nothing', () => {
    s().setupFamily('Parent');
    expect(() => s().addProfile({ name: 'Adam', level: 3, medium: 'fr' as never })).toThrow('Invalid teaching language: fr');
    expect(s().profiles).toEqual([]);
  });

  it('a parent can switch it later; invalid values change nothing', () => {
    const id = setupChild();
    s().updateProfile(id, { medium: 'ms' });
    expect(profile(id).medium).toBe('ms');
    expect(() => s().updateProfile(id, { medium: 'xx' as never })).toThrow('Invalid teaching language');
    expect(profile(id).medium).toBe('ms');
  });

  it('progress is shared across languages: same topic ids, so switching keeps every star', () => {
    const id = setupChild();
    playQuiz('s3-math-fractions-q1');
    const before = structuredClone(progressOf(id).topics);
    s().updateProfile(id, { medium: 'ms' });
    expect(progressOf(id).topics).toEqual(before);
    expect(getContentIndex('ms').topic('s3-math-fractions')?.topic.title).toBe('Pecahan, Perpuluhan dan Peratus');
    expect(getContentIndex().topic('s3-math-fractions')?.topic.title).toBe('Fractions, Decimals & Percent');
  });
});

describe('setSchoolTopic', () => {
  it('pins this week’s topic per subject and marks the family data as changed', () => {
    const id = setupChild();
    const before = s().dirtyAt;
    expect(s().setSchoolTopic(id, 'math', 's3-math-fractions')).toBe(true);
    expect(s().setSchoolTopic(id, 'science', 's3-sci-teeth')).toBe(true);
    expect(profile(id).schoolTopics).toEqual({ math: 's3-math-fractions', science: 's3-sci-teeth' });
    expect(s().dirtyAt).not.toBe(before);
    // Moving on to the next topic replaces the old one.
    expect(s().setSchoolTopic(id, 'math', 's3-math-money')).toBe(true);
    expect(profile(id).schoolTopics).toEqual({ math: 's3-math-money', science: 's3-sci-teeth' });
  });

  it('"Not sure" (null) clears a subject', () => {
    const id = setupChild();
    s().setSchoolTopic(id, 'math', 's3-math-fractions');
    expect(s().setSchoolTopic(id, 'math', null)).toBe(true);
    expect(profile(id).schoolTopics).toEqual({});
    // Clearing a subject that was never set is harmless.
    expect(s().setSchoolTopic(id, 'science', null)).toBe(true);
  });

  it.each<[string, (id: string) => Parameters<ReturnType<typeof s>['setSchoolTopic']>]>([
    ['an unknown child', () => ['ghost', 'math', 's3-math-fractions']],
    ['a subject the standard does not have', (id: string) => [id, 'sejarah', 's4-sej-diri']],
    ['a topic from another subject', (id: string) => [id, 'math', 's3-sci-teeth']],
    ['a topic from another standard', (id: string) => [id, 'math', 's4-math-numbers']],
    ['an unknown topic', (id: string) => [id, 'math', 'nope']],
  ])('refuses %s', (_, args) => {
    const id = setupChild();
    const before = s().dirtyAt;
    expect(s().setSchoolTopic(...args(id))).toBe(false);
    expect(profile(id).schoolTopics).toBeUndefined();
    expect(s().dirtyAt).toBe(before);
  });

  it('moving up a standard clears the old school topics; other edits keep them', () => {
    const id = setupChild();
    s().setSchoolTopic(id, 'math', 's3-math-fractions');
    s().updateProfile(id, { name: 'Adam Hakimi', level: 3, medium: 'ms' });
    expect(profile(id).schoolTopics).toEqual({ math: 's3-math-fractions' });
    s().updateProfile(id, { level: 4 });
    expect(profile(id).schoolTopics).toEqual({});
    expect(s().setSchoolTopic(id, 'math', 's4-math-numbers')).toBe(true);
  });
});

describe('daily quests follow the school', () => {
  // Today's quests were rolled when the child was selected; changes apply from tomorrow.
  const subjectQuests = (id: string, days: number) => {
    const found: string[] = [];
    for (let d = 0; d < days; d++) {
      advanceDays(1);
      s().ensureToday();
      for (const q of progressOf(id).quests.list) if (q.kind === 'quizzesInSubject') found.push(`${q.subjectId}|${q.title}`);
    }
    return found;
  };

  it('without school topics, subject quests rotate through every subject', () => {
    const id = setupChild();
    const subjects = new Set(subjectQuests(id, 40).map((q) => q.split('|')[0]));
    expect(subjects.size).toBeGreaterThan(2);
  });

  it('with school topics, subject quests come only from those subjects', () => {
    const id = setupChild();
    s().setSchoolTopic(id, 'science', 's3-sci-teeth');
    const found = subjectQuests(id, 40);
    expect(found.length).toBeGreaterThan(3);
    expect(new Set(found.map((q) => q.split('|')[0]))).toEqual(new Set(['science']));
  });

  it('quests name subjects in the child’s teaching language', () => {
    const id = setupChild();
    s().updateProfile(id, { medium: 'ms' });
    s().setSchoolTopic(id, 'math', 's3-math-money');
    const found = subjectQuests(id, 40);
    expect(found.length).toBeGreaterThan(0);
    for (const q of found) expect(q).toMatch(/^math\|Complete [12] Matematik quiz/);
  });
});

describe('mastery date (for the weekly report)', () => {
  it('is stamped the first time a topic is mastered and never moves after', () => {
    const id = setupChild();
    playQuiz('s3-math-fractions-q1', [true, true, true, false, false, false]);
    expect(progressOf(id).topics['s3-math-fractions'].masteredAt).toBeUndefined();
    playQuiz('s3-math-fractions-q1');
    const at = Date.now();
    expect(progressOf(id).topics['s3-math-fractions'].masteredAt).toBe(at);
    advanceDays(3);
    playQuiz('s3-math-fractions-q1');
    s().finishLesson({ topicId: 's3-math-fractions', seconds: 60 });
    expect(progressOf(id).topics['s3-math-fractions'].masteredAt).toBe(at);
  });

  it('review rounds never count as mastering a topic', () => {
    const id = setupChild();
    s().finishQuiz({ quizId: REVIEW_QUIZ_ID, topicId: 's3-math-fractions', standardId: 'std3', subjectId: 'math', title: 'Tricky', mode: 'review', correct: 6, total: 6, seconds: 60 });
    expect(progressOf(id).topics['s3-math-fractions']?.masteredAt).toBeUndefined();
    // Nor does claiming a review mode for an ordinary quiz skip the stamp (the syllabus decides).
    playQuiz('s3-math-fractions-q1', undefined, { mode: 'review' });
    expect(progressOf(id).topics['s3-math-fractions'].masteredAt).toBe(Date.now());
  });

  it('topics mastered before this was tracked get their date on the next lesson', () => {
    const id = setupChild();
    playQuiz('s3-math-fractions-q1');
    useApp.setState((st) => {
      const p = structuredClone(st.progress[id]);
      delete p.topics['s3-math-fractions'].masteredAt;
      return { progress: { ...st.progress, [id]: p } };
    });
    advanceDays(1);
    s().finishLesson({ topicId: 's3-math-fractions', seconds: 60 });
    expect(progressOf(id).topics['s3-math-fractions'].masteredAt).toBe(Date.now());
  });
});
