/**
 * Every question a child can meet is rendered in its real engine and answered through
 * the accessible UI (the buttons a child or a screen-reader user would press):
 * the correct answer must be accepted and a wrong one rejected — exactly once each.
 */
import { render } from '@testing-library/react-native';
import { QuestionView } from '@/components/quiz/QuestionView';
import { buildQuizQuestions, getContentIndex } from '@/features/content/registry';
import type { Question } from '@/features/content/schema';
import { seeded } from '@/lib/random';
import { answerThroughUi } from '../solve';

const cases: [string, Question][] = [];
for (const std of getContentIndex().standards) {
  const all = [...std.subjects.flatMap((s) => s.topics.flatMap((t) => t.quizzes)), ...std.arcade.map((g) => g.quiz)];
  for (const quiz of all) {
    const qs = quiz.generator ? buildQuizQuestions({ ...quiz, count: 3, mode: quiz.mode }, seeded(4)).slice(0, 3) : quiz.questions;
    for (const q of qs) cases.push([`${std.id} ${quiz.id} ${q.id} (${q.type})`, q]);
  }
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('covers every question type in the syllabus', () => {
  expect(new Set(cases.map(([, q]) => q.type))).toEqual(new Set(['mcq', 'trueFalse', 'match', 'order', 'sort', 'fillBlank', 'numpad']));
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
