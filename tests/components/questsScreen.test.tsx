import { fireEvent, render, screen } from '@testing-library/react-native';
import Quests from '@/app/(tabs)/quests';
import type { Quest } from '@/features/gamify/quests';
import { dayKey } from '@/lib/date';
import { advanceDays, authoredQuiz, patchProgress, playQuiz, progressOf, resetStores, setNow, setupChild } from '../helpers';

const quest = (over: Partial<Quest>): Quest => ({ id: `${dayKey()}-0`, kind: 'correct', title: 'Get 2 answers right', emoji: '✅', target: 2, progress: 0, reward: 30, claimed: false, ...over });

beforeEach(() => {
  setNow('2026-03-04T18:30:00');
  resetStores();
  setupChild();
});
afterEach(() => jest.useRealTimers());

it('claiming a finished quest pays coins once and ticks it off', async () => {
  patchProgress((p) => (p.quests = { day: dayKey(), list: [quest({ progress: 2 }), quest({ id: 'b', title: 'Read a lesson', kind: 'lesson', target: 1 })] }));
  await render(<Quests />);
  expect(screen.getByText("Today's quests · 0/2")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '+30 🪙' }));
  expect(progressOf().coins).toBe(80);
  expect(screen.getByText("Today's quests · 1/2")).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: '+30 🪙' })).toBeNull();
});

it('shows the time until quests reset at midnight', async () => {
  await render(<Quests />);
  expect(screen.getByText('Resets in 5h 30m')).toBeOnTheScreen();
});

it('the streak card and calendar agree with the streak rule', async () => {
  const quiz = authoredQuiz().quiz.id;
  playQuiz(quiz); // Wed
  advanceDays(1);
  // Thu: answered some questions but never finished anything — not a streak day.
  patchProgress((p) => (p.days[dayKey()] = { answered: 4, correct: 2, seconds: {} }));
  const day = (d: string) => screen.getByTestId(`day-${d}`).props.accessibilityLabel;
  const view = await render(<Quests />);
  expect(screen.getByText('1 day')).toBeOnTheScreen();
  expect(screen.getByText('Finish a quiz today to keep it!')).toBeOnTheScreen();
  expect(day('2026-03-04')).toBe('Wednesday: streak day');
  expect(day('2026-03-05')).toBe('Thursday: today, not done yet');
  expect(day('2026-03-03')).toBe('Tuesday: no streak');
  await view.unmount();
  playQuiz(quiz);
  await render(<Quests />);
  expect(screen.getByText('2 days')).toBeOnTheScreen();
  expect(screen.getByText('Streak safe today! 🎉')).toBeOnTheScreen();
  expect(day('2026-03-05')).toBe('Thursday: streak day');
});
