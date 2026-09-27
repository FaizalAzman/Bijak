/**
 * The hint button: offered in practice and review (never in time attacks or for true/false),
 * shown once, and reflected in the rewards and the results screen.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuizScreen from '@/app/quiz/[quizId]';
import { QuestionView } from '@/components/quiz/QuestionView';
import { Results, type ResultsData } from '@/components/quiz/Results';
import { Question } from '@/features/content/schema';
import { hintedXp } from '@/features/gamify/xp';
import { useApp } from '@/store/app';
import { index, progressOf, resetStores, setNow, setupChild } from '../helpers';
import { answerThroughUi } from '../solve';

const setParams = (p: Record<string, string>) => ((globalThis as { __routeParams?: object }).__routeParams = p);
const MCQ = Question.parse({ id: 'm1', type: 'mcq', prompt: 'Pick the fish', options: [{ id: 'a', text: 'Cat' }, { id: 'b', text: 'Fish' }, { id: 'c', text: 'Dog' }, { id: 'd', text: 'Bird' }], answer: 'b' });

beforeEach(() => {
  setNow('2026-03-02T09:00:00');
  resetStores();
  setupChild({ level: 3 });
});
afterEach(() => jest.useRealTimers());

describe('the hint button', () => {
  it('shows a hint once, in the question’s language, and tells the quiz', async () => {
    const onHint = jest.fn();
    await render(<QuestionView q={MCQ} onAnswer={jest.fn()} locked={false} onHint={onHint} />);
    expect(screen.queryByTestId('hint')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Hint' }));
    expect(onHint).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('hint')).toHaveTextContent(/^💡 It isn’t (Cat|Dog|Bird) or (Cat|Dog|Bird)\.$/);
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
  });

  it('is labelled Petunjuk on a Bahasa Melayu question', async () => {
    await render(<QuestionView q={{ ...MCQ, lang: 'ms' }} onAnswer={jest.fn()} locked={false} onHint={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Petunjuk' }));
    expect(screen.getByTestId('hint')).toHaveTextContent(/Jawapannya bukan/);
  });

  it('is not offered in time attacks, without a listener, for true/false, or once answered', async () => {
    const cases = [
      <QuestionView key="fast" q={MCQ} onAnswer={jest.fn()} locked={false} fast onHint={jest.fn()} />,
      <QuestionView key="none" q={MCQ} onAnswer={jest.fn()} locked={false} />,
      <QuestionView key="tf" q={Question.parse({ id: 't', type: 'trueFalse', prompt: 'Fish swim.', answer: true })} onAnswer={jest.fn()} locked={false} onHint={jest.fn()} />,
      <QuestionView key="locked" q={MCQ} onAnswer={jest.fn()} locked onHint={jest.fn()} />,
    ];
    for (const el of cases) {
      const view = await render(el);
      expect(screen.queryByTestId('hint-button')).toBeNull();
      await view.unmount();
    }
  });
});

describe('a quiz with hints', () => {
  const QUIZ = 's3-sci-rules-q1';

  it('pays half for the hinted answer, is never “perfect”, and says how many hints were used', async () => {
    setParams({ quizId: QUIZ, fixed: '1' });
    await render(<QuizScreen />);
    const qs = index().quiz(QUIZ)!.quiz.questions;
    // Sort (no hint needed) → MCQ with a hint → true/false.
    await answerThroughUi(qs[0], true);
    await fireEvent.press(screen.getByTestId('continue'));
    await fireEvent.press(screen.getByTestId('hint-button'));
    await answerThroughUi(qs[1], true);
    expect(screen.getByText(`+${hintedXp(qs[1].difficulty)} XP`)).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('continue'));
    // The next question starts without the hint.
    expect(screen.queryByTestId('hint')).toBeNull();
    await answerThroughUi(qs[2], true);
    await fireEvent.press(screen.getByTestId('continue'));

    expect(screen.queryByText('Perfect score!')).toBeNull();
    expect(screen.getByText('Well done!')).toBeOnTheScreen();
    expect(screen.getByText('💡 1 with a hint')).toBeOnTheScreen();
    expect(screen.getByTestId('stars').props.accessibilityLabel).toBe('2 of 3 stars');
    const p = progressOf();
    expect(p.attempts[0]).toMatchObject({ correct: 3, total: 3, hinted: 1 });
    expect(p.totals.perfect).toBe(0);
    expect(p.topics['s3-sci-rules'].best[QUIZ]).toBe(83);
    // Needing a hint means it comes back for practice.
    expect(Object.keys(p.srs)).toEqual([`${QUIZ}::${qs[1].id}`]);
  });
});

describe('results with hints', () => {
  const data = (over: Partial<ResultsData>): ResultsData => ({ title: 'Quiz', timeAttack: false, correct: 8, total: 8, xp: 90, coins: 20, seconds: 75, streak: 2, newBest: false, badges: [], mistakes: [], ...over });

  it('stars and the headline count a hinted answer as half', async () => {
    await render(<Results data={data({ hinted: 1 })} onDone={jest.fn()} onRetry={jest.fn()} />);
    expect(screen.getByText('Well done!')).toBeOnTheScreen();
    expect(screen.getByTestId('stars').props.accessibilityLabel).toBe('2 of 3 stars');
  });

  it('says it in Bahasa Melayu too', async () => {
    useApp.getState().updateSettings({ uiLang: 'ms' });
    await render(<Results data={data({ correct: 6, hinted: 2 })} onDone={jest.fn()} onRetry={jest.fn()} />);
    expect(screen.getByText('💡 2 dengan petunjuk')).toBeOnTheScreen();
  });

  it('time attacks never show hints', async () => {
    await render(<Results data={data({ timeAttack: true, correct: 30, total: 32, hinted: 4 })} onDone={jest.fn()} onRetry={jest.fn()} />);
    expect(screen.queryByText(/with a hint/)).toBeNull();
  });
});
