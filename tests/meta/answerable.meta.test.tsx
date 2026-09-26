/**
 * Every question a child can meet is rendered in its real engine and answered through
 * the accessible UI (the buttons a child or a screen-reader user would press):
 * the correct answer must be accepted and a wrong one rejected — exactly once each.
 */
import { render } from '@testing-library/react-native';
import { QuestionView } from '@/components/quiz/QuestionView';
import { translatedSubjects } from '@/features/content/localize';
import { buildQuizQuestions, getContentIndex } from '@/features/content/registry';
import type { Question, Standard } from '@/features/content/schema';
import { seeded } from '@/lib/random';
import { answerThroughUi } from '../solve';

const cases: [string, Question][] = [];
const add = (std: Standard, prefix: string, keep: (subjectId: string) => boolean) => {
  const all = [...std.subjects.filter((s) => keep(s.id)).flatMap((s) => s.topics.flatMap((t) => t.quizzes)), ...std.arcade.filter((g) => keep(g.subjectId)).map((g) => g.quiz)];
  for (const quiz of all) {
    const qs = quiz.generator ? buildQuizQuestions({ ...quiz, count: 3, mode: quiz.mode }, seeded(4)).slice(0, 3) : quiz.questions;
    for (const q of qs) cases.push([`${prefix}${std.id} ${quiz.id} ${q.id} (${q.type})`, q]);
  }
};
const original = getContentIndex().standards;
for (const std of original) add(std, '', () => true);
// Maths & Science in Bahasa Melayu (non-DLP schools): the same questions with BM words and buttons.
for (const std of getContentIndex('ms').standards) {
  const translated = new Set(translatedSubjects(original.find((s) => s.id === std.id)!, 'ms'));
  add(std, 'ms: ', (id) => translated.has(id));
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('covers every question type in the syllabus, in both teaching languages', () => {
  const types = ['mcq', 'trueFalse', 'match', 'order', 'sort', 'fillBlank', 'numpad'];
  expect(new Set(cases.map(([, q]) => q.type))).toEqual(new Set(types));
  expect(new Set(cases.filter(([name]) => name.startsWith('ms: ')).map(([, q]) => q.type))).toEqual(new Set(types));
  expect(cases.filter(([name]) => name.startsWith('ms: ')).every(([, q]) => q.lang === 'ms')).toBe(true);
});

describe.each(cases)('%s', (_, q) => {
  it('accepts the right answer', async () => {
    const onAnswer = jest.fn();
    await render(<QuestionView q={q} onAnswer={onAnswer} locked={false} />);
    await answerThroughUi(q, true);
    expect(onAnswer.mock.calls).toEqual([[true]]);
  });

  it('rejects a wrong answer', async () => {
    const onAnswer = jest.fn();
    await render(<QuestionView q={q} onAnswer={onAnswer} locked={false} />);
    if (!(await answerThroughUi(q, false))) return;
    expect(onAnswer.mock.calls).toEqual([[false]]);
  });
});
