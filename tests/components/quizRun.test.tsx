import { act, fireEvent, render, screen } from '@testing-library/react-native';
import QuizScreen from '@/app/quiz/[quizId]';
import * as registry from '@/features/content/registry';
import type { Question } from '@/features/content/schema';
import { REWARDS } from '@/features/gamify/xp';
import { seeded } from '@/lib/random';
import { index, patchProgress, progressOf, resetStores, setNow, setupChild } from '../helpers';
import { answerThroughUi, press } from '../solve';

const setParams = (p: Record<string, string>) => ((globalThis as { __routeParams?: object }).__routeParams = p);

beforeEach(() => {
  setNow('2026-03-02T09:00:00');
  resetStores();
  setupChild({ level: 3 });
});
afterEach(() => jest.useRealTimers());

async function playThrough(questions: Question[], pattern: boolean[]) {
  for (let i = 0; i < questions.length; i++) {
    await answerThroughUi(questions[i], pattern[i]);
    await fireEvent.press(screen.getByTestId('continue'));
  }
}

describe('practice quiz, end to end', () => {
  const QUIZ = 's3-sci-rules-q1';
  const questions = () => index().quiz(QUIZ)!.quiz.questions;

  it('a perfect run shows exactly the XP and coins the child received', async () => {
    setParams({ quizId: QUIZ, fixed: '1' });
    await render(<QuizScreen />);
    await playThrough(questions(), [true, true, true]);
    const p = progressOf();
    expect(screen.getByText('Perfect score!')).toBeOnTheScreen();
    expect(screen.getByText(`+${p.xp}`)).toBeOnTheScreen();
    expect(screen.getByText(`+${p.coins - 50}`)).toBeOnTheScreen();
    expect(p.coins - 50).toBe(3 * REWARDS.coinPerCorrect + REWARDS.quizComplete.coins + REWARDS.perfect.coins);
    expect(screen.getByText('🔥 1-day streak')).toBeOnTheScreen();
    expect(screen.getByText('First Steps')).toBeOnTheScreen();
  });

  it('playing again the same day earns only the per-answer rewards, and the screen says so', async () => {
    setParams({ quizId: QUIZ, fixed: '1' });
    await render(<QuizScreen />);
    await playThrough(questions(), [true, true, true]);
    const afterFirst = progressOf();
    await fireEvent.press(screen.getByRole('button', { name: 'Play again' }));
    await playThrough(questions(), [true, true, true]);
    const p = progressOf();
    expect(p.coins - afterFirst.coins).toBe(3 * REWARDS.coinPerCorrect);
    expect(screen.getByText(`+${p.xp - afterFirst.xp}`)).toBeOnTheScreen();
    expect(screen.getByText(`+${3 * REWARDS.coinPerCorrect}`)).toBeOnTheScreen();
  });

  it('mistakes show the right answer, count against the score and are saved for review', async () => {
    setParams({ quizId: QUIZ, fixed: '1' });
    await render(<QuizScreen />);
    const qs = questions();
    await answerThroughUi(qs[0], false);
    expect(screen.getByTestId('continue')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('continue'));
    await playThrough(qs.slice(1), [true, true]);
    expect(screen.getByText('2/3')).toBeOnTheScreen();
    expect(Object.keys(progressOf().srs)).toEqual([`${QUIZ}::${qs[0].id}`]);
    expect(progressOf().topics['s3-sci-rules'].best[QUIZ]).toBe(67);
  });

  it('the results offer a look back at exactly the questions that went wrong', async () => {
    setParams({ quizId: QUIZ, fixed: '1' });
    await render(<QuizScreen />);
    const qs = questions();
    await playThrough(qs, [true, false, false]);
    await fireEvent.press(screen.getByRole('button', { name: 'Mistakes (2)' }));
    expect(screen.getByTestId('mistakes')).toBeOnTheScreen();
    for (const q of [qs[1], qs[2]]) expect(screen.getByText(q.prompt)).toBeOnTheScreen();
    expect(screen.queryByText(qs[0].prompt)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Back to results' }));
    // Playing again starts a fresh list.
    await fireEvent.press(screen.getByRole('button', { name: 'Play again' }));
    await playThrough(qs, [true, true, false]);
    await fireEvent.press(screen.getByRole('button', { name: 'Mistakes (1)' }));
    expect(screen.getByText(qs[2].prompt)).toBeOnTheScreen();
    expect(screen.queryByText(qs[1].prompt)).toBeNull();
  });

  it('shows a friendly message for a quiz that no longer exists', async () => {
    setParams({ quizId: 'deleted-quiz' });
    await render(<QuizScreen />);
    expect(screen.getByText('Quiz not found')).toBeOnTheScreen();
  });

  it('review with nothing due says so', async () => {
    setParams({ quizId: 'review' });
    await render(<QuizScreen />);
    expect(screen.getByText('Nothing to review!')).toBeOnTheScreen();
  });
});

describe('review session, end to end', () => {
  it('replays tricky questions and promotes them', async () => {
    const QUIZ = 's3-sci-rules-q1';
    setParams({ quizId: QUIZ, fixed: '1' });
    const qs = index().quiz(QUIZ)!.quiz.questions;
    const first = await render(<QuizScreen />);
    await playThrough(qs, [false, false, true]);
    await first.unmount();
    expect(Object.keys(progressOf().srs)).toHaveLength(2);

    setParams({ quizId: 'review' });
    await render(<QuizScreen />);
    const due = Object.values(progressOf().srs).sort((a, b) => a.due - b.due || b.lapses - a.lapses);
    await playThrough(
      due.map((c) => c.q),
      [true, true],
    );
    expect(Object.values(progressOf().srs).every((c) => c.box === 1)).toBe(true);
    expect(progressOf().totals.reviews).toBe(2);
  });
});

describe('time attack, end to end', () => {
  it('counts correct answers until time is up and records a new best', async () => {
    const real = registry.buildQuizQuestions;
    let built: Question[] = [];
    const spy = jest.spyOn(registry, 'buildQuizQuestions').mockImplementation((quiz) => (built = real(quiz, seeded(7))));
    patchProgress({ timeAttackBest: {} });
    setParams({ quizId: 's3-arcade-times-quiz' });
    await render(<QuizScreen />);
    await press('Start!');
    for (let i = 0; i < 5; i++) {
      await answerThroughUi(built[i], i !== 2);
      await act(async () => jest.advanceTimersByTime(600));
    }
    expect(screen.getByTestId('ta-score')).toHaveTextContent('⚡ 4');
    await act(async () => jest.advanceTimersByTime(61_000));
    expect(screen.getByText('New best score!')).toBeOnTheScreen();
    expect(progressOf().timeAttackBest['s3-arcade-times-quiz']).toBe(4);
    expect(progressOf().attempts[0]).toMatchObject({ mode: 'timeAttack', correct: 4, total: 5 });
    // Time attacks are about speed: no list of mistakes at the end.
    expect(screen.queryByTestId('see-mistakes')).toBeNull();
    spy.mockRestore();
  });
});
