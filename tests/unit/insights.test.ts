import { buildIndex } from '@/features/content/registry';
import { Standard } from '@/features/content/schema';
import { accuracyPerSubject, minutesPerDay, timePerSubject, weakTopics } from '@/features/insights/insights';
import { emptyProgress } from '@/store/app';
import type { Progress } from '@/store/types';
import { setNow } from '../helpers';

const std = Standard.parse({
  id: 'std3',
  level: 3,
  title: 'Standard 3',
  version: 1,
  subjects: [
    {
      id: 'math',
      name: 'Maths',
      emoji: '🔢',
      topics: [
        { id: 't1', title: 'Times tables', objectives: [{ code: '1.1', text: 'Multiply' }], offlineActivity: 'Count coins', quizzes: [{ id: 'q1', title: 'Q', generator: { kind: 'addition', max: 9 } }] },
        { id: 't2', title: 'Money', quizzes: [{ id: 'q2', title: 'Q', generator: { kind: 'addition', max: 9 } }] },
      ],
    },
    { id: 'sci', name: 'Science', emoji: '🔬', topics: [{ id: 't3', title: 'Plants', quizzes: [{ id: 'q3', title: 'Q', generator: { kind: 'addition', max: 9 } }] }] },
  ],
});
const index = buildIndex([std]);
const topic = (answered: number, correct: number) => ({ answered, correct, lessonDone: false, best: {}, lastAt: 0 });

describe('weakTopics', () => {
  it('ignores topics with fewer than 3 answers or ≥80% accuracy and no repeat mistakes', () => {
    const p: Progress = { ...emptyProgress(), topics: { t1: topic(2, 0), t2: topic(10, 8), t3: topic(5, 5) } };
    expect(weakTopics(p, index)).toEqual([]);
  });

  it('flags low accuracy and repeat mistakes, weakest first, with objectives and a home activity', () => {
    const p: Progress = { ...emptyProgress(), topics: { t1: topic(10, 3), t2: topic(10, 6), t3: topic(10, 9) } };
    p.srs = {
      k: { key: 'k', quizId: 'q3', standardId: 'std3', subjectId: 'sci', topicId: 't3', q: { id: 'x', type: 'trueFalse', prompt: 'p', lang: 'en', difficulty: 1, answer: true }, box: 0, due: 0, lapses: 3, reviews: 3, lastAt: 0 },
    };
    const weak = weakTopics(p, index);
    expect(weak.map((w) => w.topicId)).toEqual(['t1', 't2', 't3']);
    expect(weak[0]).toMatchObject({ title: 'Times tables', subject: 'Maths', accuracy: 30, answered: 10, lapses: 0, activity: 'Count coins' });
    expect(weak[0].objectives).toEqual([{ code: '1.1', text: 'Multiply' }]);
    expect(weak[2].lapses).toBe(3);
    expect(weakTopics(p, index, 1)).toHaveLength(1);
  });

  it('skips topics that no longer exist in the syllabus', () => {
    const p: Progress = { ...emptyProgress(), topics: { gone: topic(10, 1) } };
    expect(weakTopics(p, index)).toEqual([]);
  });
});

describe('time and accuracy', () => {
  beforeEach(() => setNow('2026-03-04T10:00:00')); // a Wednesday
  afterEach(() => jest.useRealTimers());

  it('minutesPerDay lists the last 7 days oldest first with weekday labels', () => {
    const p = emptyProgress();
    p.days['2026-03-04'] = { answered: 0, correct: 0, seconds: { 'std3/math': 150, 'std3/sci': 29 } };
    p.days['2026-02-20'] = { answered: 0, correct: 0, seconds: { 'std3/math': 6000 } };
    const days = minutesPerDay(p);
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ day: '2026-02-26', label: 'Thu', value: 0 });
    expect(days[6]).toEqual({ day: '2026-03-04', label: 'Wed', value: 3 });
  });

  it('timePerSubject sums this week per standard/subject, biggest first', () => {
    const p = emptyProgress();
    p.days['2026-03-04'] = { answered: 0, correct: 0, seconds: { 'std3/math': 120, 'std3/sci': 600 } };
    p.days['2026-03-01'] = { answered: 0, correct: 0, seconds: { 'std3/math': 120 } };
    p.days['2026-01-01'] = { answered: 0, correct: 0, seconds: { 'std3/math': 99999 } };
    expect(timePerSubject(p, index)).toEqual([
      { label: '🔬 Science · Std 3', value: 10 },
      { label: '🔢 Maths · Std 3', value: 4 },
    ]);
  });

  it('timePerSubject still shows subjects that were removed from the syllabus', () => {
    const p = emptyProgress();
    p.days['2026-03-04'] = { answered: 0, correct: 0, seconds: { 'std9/art': 60 } };
    expect(timePerSubject(p, index)).toEqual([{ label: 'art', value: 1 }]);
  });

  it('accuracyPerSubject aggregates topics by subject', () => {
    const p: Progress = { ...emptyProgress(), topics: { t1: topic(10, 5), t2: topic(10, 10), t3: topic(4, 1), gone: topic(9, 9) } };
    expect(accuracyPerSubject(p, index)).toEqual([
      { label: '🔢 Maths', value: 75, hint: '(20 Qs)' },
      { label: '🔬 Science', value: 25, hint: '(4 Qs)' },
    ]);
  });
});
