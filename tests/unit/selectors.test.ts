import { Standard, type Topic } from '@/features/content/schema';
import { greeting, nextTopic, subjectProgress, topicStatus } from '@/features/progress/selectors';
import { emptyProgress } from '@/store/app';
import type { Progress, TopicStat } from '@/store/types';

const LESSON = [{ type: 'text', text: 'Hello' }];
const QUIZ = (id: string) => ({ id, title: id, generator: { kind: 'addition', max: 10 } });

const std = Standard.parse({
  id: 'stdt',
  level: 3,
  title: 'Standard 3',
  version: 1,
  subjects: [
    {
      id: 'math',
      name: 'Maths',
      emoji: '🔢',
      topics: [
        { id: 'both', title: 'Both', lesson: LESSON, quizzes: [QUIZ('both-q1'), QUIZ('both-q2')] },
        { id: 'quizonly', title: 'Quiz only', quizzes: [QUIZ('qo-q1')] },
        { id: 'lessononly', title: 'Lesson only', lesson: LESSON },
      ],
    },
    { id: 'sci', name: 'Science', emoji: '🔬', topics: [{ id: 'sci1', title: 'Plants', lesson: LESSON, quizzes: [QUIZ('sci1-q1')] }] },
  ],
});
const topic = (id: string): Topic => std.subjects.flatMap((s) => s.topics).find((t) => t.id === id)!;
const stat = (over: Partial<TopicStat> = {}): TopicStat => ({ answered: 0, correct: 0, lessonDone: false, best: {}, lastAt: 0, ...over });
const progress = (topics: Record<string, TopicStat>): Progress => ({ ...emptyProgress(), topics });

describe('topicStatus', () => {
  it('an untouched topic has nothing done', () => {
    expect(topicStatus(topic('both'), emptyProgress())).toEqual({ lessonDone: false, quizzesTotal: 2, quizzesDone: 0, score: 0, stars: 0, mastered: false, ratio: 0 });
  });

  it('reading the lesson is 20% and one star', () => {
    const s = topicStatus(topic('both'), progress({ both: stat({ lessonDone: true }) }));
    expect(s.ratio).toBeCloseTo(0.2);
    expect(s.stars).toBe(1);
    expect(s.lessonDone).toBe(true);
  });

  it('quiz scores fill the other 80%', () => {
    const s = topicStatus(topic('both'), progress({ both: stat({ lessonDone: true, best: { 'both-q1': 100, 'both-q2': 50 } }) }));
    expect(s.score).toBe(75);
    expect(s.ratio).toBeCloseTo(0.2 + 0.8 * 0.75);
    expect(s.stars).toBe(2);
    expect(s.mastered).toBe(false);
  });

  it('mastery needs 80%+ on every quiz and gives three stars', () => {
    const s = topicStatus(topic('both'), progress({ both: stat({ best: { 'both-q1': 80, 'both-q2': 95 } }) }));
    expect(s.mastered).toBe(true);
    expect(s.stars).toBe(3);
    expect(s.quizzesDone).toBe(2);
  });

  it('a quiz-only topic starts at 0% (not a free 20%) and is complete at 100%', () => {
    expect(topicStatus(topic('quizonly'), emptyProgress()).ratio).toBe(0);
    expect(topicStatus(topic('quizonly'), emptyProgress()).lessonDone).toBe(true);
    const done = topicStatus(topic('quizonly'), progress({ quizonly: stat({ best: { 'qo-q1': 100 } }) }));
    expect(done.ratio).toBe(1);
    expect(done.mastered).toBe(true);
  });

  it('a lesson-only topic starts at 0% (not a free 80%) and is mastered once read', () => {
    const fresh = topicStatus(topic('lessononly'), emptyProgress());
    expect(fresh.ratio).toBe(0);
    expect(fresh.mastered).toBe(false);
    const read = topicStatus(topic('lessononly'), progress({ lessononly: stat({ lessonDone: true }) }));
    expect(read.ratio).toBe(1);
    expect(read.mastered).toBe(true);
    expect(read.stars).toBe(3);
  });

  it('clamps corrupt scores into 0..100', () => {
    const s = topicStatus(topic('quizonly'), progress({ quizonly: stat({ best: { 'qo-q1': 250 } }) }));
    expect(s.score).toBe(100);
    expect(s.ratio).toBe(1);
    const neg = topicStatus(topic('quizonly'), progress({ quizonly: stat({ best: { 'qo-q1': -40 } }) }));
    expect(neg.score).toBe(0);
    expect(neg.ratio).toBe(0);
  });

  it('ratio always stays within 0..1', () => {
    for (const id of ['both', 'quizonly', 'lessononly'])
      for (const lessonDone of [false, true])
        for (const b of [0, 30, 80, 100]) {
          const r = topicStatus(topic(id), progress({ [id]: stat({ lessonDone, best: { 'both-q1': b, 'both-q2': b, 'qo-q1': b } }) })).ratio;
          expect(r).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThanOrEqual(1);
        }
  });
});

describe('subjectProgress', () => {
  it('averages topic completion and counts mastered topics', () => {
    const p = progress({ quizonly: stat({ best: { 'qo-q1': 100 } }), lessononly: stat({ lessonDone: true }) });
    const s = subjectProgress(std.subjects[0], p);
    expect(s.total).toBe(3);
    expect(s.mastered).toBe(2);
    expect(s.ratio).toBeCloseTo(2 / 3);
  });

  it('an empty subject is 0%', () => {
    expect(subjectProgress({ ...std.subjects[0], topics: [] }, emptyProgress())).toEqual({ ratio: 0, mastered: 0, total: 0 });
  });
});

describe('nextTopic', () => {
  it('returns null without a standard', () => {
    expect(nextTopic(undefined, emptyProgress())).toBeNull();
  });

  it('suggests a topic already in progress first', () => {
    const p = progress({ sci1: stat({ lessonDone: true, lastAt: 5 }) });
    expect(nextTopic(std, p)?.topic.id).toBe('sci1');
  });

  it('otherwise the first topic, rotating to the subject studied least recently', () => {
    expect(nextTopic(std, emptyProgress())?.topic.id).toBe('both');
    // Maths was studied recently (mastered quiz-only topic), so Science comes first among first topics.
    const p = progress({ quizonly: stat({ best: { 'qo-q1': 100 }, lastAt: 1000 }) });
    expect(nextTopic(std, p)?.topic.id).toBe('sci1');
  });

  it('never suggests lesson-only or mastered topics, and returns null when all are mastered', () => {
    const all = progress({
      both: stat({ best: { 'both-q1': 100, 'both-q2': 100 } }),
      quizonly: stat({ best: { 'qo-q1': 100 } }),
      sci1: stat({ best: { 'sci1-q1': 90 } }),
    });
    expect(nextTopic(std, all)).toBeNull();
  });

  it('prefers the topic the class is on at school this week', () => {
    const p = progress({ both: stat({ lessonDone: true, lastAt: 5 }) });
    expect(nextTopic(std, p)?.topic.id).toBe('both');
    expect(nextTopic(std, p, { sci: 'sci1' })).toMatchObject({ subject: { id: 'sci' }, topic: { id: 'sci1' } });
    // Several subjects pinned: the first subject's school topic leads.
    expect(nextTopic(std, p, { sci: 'sci1', math: 'quizonly' })?.topic.id).toBe('quizonly');
  });

  it('falls back to the usual order when the school topic is mastered, lesson-only or unknown', () => {
    const p = progress({ both: stat({ lessonDone: true, lastAt: 5 }), sci1: stat({ best: { 'sci1-q1': 100 } }) });
    expect(nextTopic(std, p, { sci: 'sci1' })?.topic.id).toBe('both');
    expect(nextTopic(std, p, { math: 'lessononly' })?.topic.id).toBe('both');
    expect(nextTopic(std, p, { math: 'gone' })?.topic.id).toBe('both');
  });
});

describe('greeting', () => {
  it.each([
    [0, 'Selamat pagi'],
    [11, 'Selamat pagi'],
    [12, 'Selamat tengah hari'],
    [14, 'Selamat tengah hari'],
    [15, 'Selamat petang'],
    [18, 'Selamat petang'],
    [19, 'Selamat malam'],
    [23, 'Selamat malam'],
  ])('%i:00 → %s', (h, text) => {
    expect(greeting(new Date(2026, 2, 2, h, 30))).toBe(text);
  });
});
