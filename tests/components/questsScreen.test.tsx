import { fireEvent, render, screen } from '@testing-library/react-native';
import Quests from '@/app/(tabs)/quests';
import type { Quest } from '@/features/gamify/quests';
import { dayKey } from '@/lib/date';
import { useApp } from '@/store/app';
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

describe('rest-day shields and rest days on the streak card', () => {
  it('buying a shield takes coins and shows it; the button goes when you hold the maximum', async () => {
    patchProgress({ coins: 100 });
    await render(<Quests />);
    expect(screen.getByText('Rest-day shields · 0/2')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('buy-shield'));
    expect(screen.getByText('Rest-day shields · 1/2')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('buy-shield'));
    expect(progressOf().coins).toBe(20);
    expect(screen.queryByTestId('buy-shield')).toBeNull();
  });

  it('the buy button is disabled without enough coins', async () => {
    patchProgress({ coins: 10 });
    await render(<Quests />);
    expect(screen.getByTestId('buy-shield')).toBeDisabled();
  });

  it('marks rest days and days saved by a shield, and says the streak is safe on a rest day', async () => {
    useApp.getState().updateSettings({ restDays: [6, 0] });
    setNow('2026-03-06T17:00:00'); // Friday
    playQuiz(authoredQuiz().quiz.id);
    setNow('2026-03-07T10:00:00'); // Saturday
    await render(<Quests />);
    expect(screen.getByText('Rest day — your streak is safe 💤')).toBeOnTheScreen();
    expect(screen.getByTestId('day-2026-03-06').props.accessibilityLabel).toBe('Friday: streak day');
    expect(screen.getByTestId('day-2026-03-07').props.accessibilityLabel).toBe('Saturday: rest day');
  });

  it('a covered day shows the shield and the status reflects protection', async () => {
    const quiz = authoredQuiz().quiz.id;
    playQuiz(quiz); // Wed 4th
    patchProgress((p) => (p.streak.shields = 2));
    setNow('2026-03-06T18:00:00'); // Friday — Thursday was missed
    const before = await render(<Quests />);
    expect(screen.getByText('Your shield saves the streak if you miss today 🛡️')).toBeOnTheScreen();
    await before.unmount();
    playQuiz(quiz);
    const view = await render(<Quests />);
    expect(screen.getByTestId('day-2026-03-05').props.accessibilityLabel).toBe('Thursday: saved by a shield');
    expect(screen.getAllByText('Streak safe today! 🎉').length).toBeGreaterThan(0);
    await view.unmount();
  });
});
