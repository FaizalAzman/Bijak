import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { FeedbackSheet } from '@/components/quiz/FeedbackSheet';
import { QuestionView } from '@/components/quiz/QuestionView';
import { Question } from '@/features/content/schema';
import { activate, answerThroughUi, press } from '../solve';

const Q = (raw: Record<string, unknown>) => Question.parse({ id: 'q1', prompt: 'Prompt', ...raw });
const view = async (q: Question, locked = false) => {
  const onAnswer = jest.fn();
  await render(<QuestionView q={q} onAnswer={onAnswer} locked={locked} />);
  return onAnswer;
};
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const isDisabled = (name: string | RegExp) => !!button(name).props.accessibilityState?.disabled;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const MCQ = Q({ type: 'mcq', options: [{ id: 'a', text: 'Kucing' }, { id: 'b', text: 'Anjing' }, { id: 'c', emoji: '🐟' }], answer: 'b' });

describe('multiple choice', () => {
  it('reports a correct pick once and ignores further taps', async () => {
    const onAnswer = await view(MCQ);
    await press('Anjing');
    await press('Kucing');
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('reports a wrong pick', async () => {
    const onAnswer = await view(MCQ);
    await press('🐟');
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it('does nothing while locked', async () => {
    const onAnswer = await view(MCQ, true);
    await press('Anjing');
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('shows the instruction in the question language', async () => {
    await view({ ...MCQ, lang: 'ms' });
    expect(screen.getByText('Pilih jawapan')).toBeOnTheScreen();
  });
});

describe('true / false', () => {
  it.each([
    ['en', true, 'True', true],
    ['en', true, 'False', false],
    ['ms', false, 'Salah', true],
    ['ms', false, 'Betul', false],
  ] as const)('%s answer=%s: pressing %s → %s', async (lang, answer, label, expected) => {
    const onAnswer = await view(Q({ type: 'trueFalse', lang, answer }));
    await press(label);
    await press(label === 'True' || label === 'Betul' ? (lang === 'en' ? 'False' : 'Salah') : lang === 'en' ? 'True' : 'Betul');
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(expected);
  });
});

describe('numpad', () => {
  const NUM = Q({ type: 'numpad', answer: '120' });

  it('types digits, deletes, and checks', async () => {
    const onAnswer = await view(NUM);
    expect(isDisabled('Check')).toBe(true);
    for (const k of ['1', '2', '5']) await press(k);
    expect(screen.getByTestId('numpad-value')).toHaveTextContent('125');
    await press('Delete');
    await press('0');
    await press('Check');
    expect(onAnswer).toHaveBeenCalledWith(true);
    // After checking the keypad is frozen and Check disappears.
    await press('7');
    expect(screen.getByTestId('numpad-value')).toHaveTextContent('120');
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
  });

  it('replaces a leading zero and caps very long numbers', async () => {
    await view(NUM);
    await press('0');
    await press('4');
    expect(screen.getByTestId('numpad-value')).toHaveTextContent('4');
    for (let i = 0; i < 12; i++) await press('9');
    expect(screen.getByTestId('numpad-value')).toHaveTextContent('499 999 999');
  });

  it('offers a decimal key only for decimal answers and accepts equivalent forms', async () => {
    const onAnswer = await view(Q({ type: 'numpad', answer: '2.50', unit: 'RM' }));
    expect(screen.getByText('RM')).toBeOnTheScreen();
    await press('.');
    await press('.');
    await press('5');
    expect(screen.getByTestId('numpad-value')).toHaveTextContent('0.5');
    for (let i = 0; i < 3; i++) await press('Delete');
    for (const k of ['2', '.', '5']) await press(k);
    await press('Check');
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('whole-number answers have no decimal key', async () => {
    await view(NUM);
    expect(screen.queryByRole('button', { name: '.' })).toBeNull();
  });

  it('a wrong value is reported as wrong', async () => {
    const onAnswer = await view(NUM);
    await press('1');
    await press('Check');
    expect(onAnswer).toHaveBeenCalledWith(false);
  });
});

describe('order', () => {
  const ORDER = Q({ type: 'order', tokens: ['I', 'like', 'nasi', 'lemak'], distractors: ['likes'] });

  it('builds the sentence tile by tile and checks it', async () => {
    const onAnswer = await view(ORDER);
    expect(isDisabled('Check')).toBe(true);
    await answerThroughUi(ORDER, true);
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('tiles can be taken back out of the answer', async () => {
    const onAnswer = await view(ORDER);
    await activate(button(/^likes$/));
    expect(button(/^likes$/).props.accessibilityState.disabled).toBe(true);
    await press('Remove likes');
    expect(button(/^likes$/).props.accessibilityState.disabled).toBe(false);
    for (const w of ['I', 'like', 'nasi', 'lemak']) await activate(button(new RegExp(`^${w}$`)));
    await press('Check');
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('a distractor or wrong order is wrong', async () => {
    const onAnswer = await view(ORDER);
    for (const w of ['I', 'likes', 'nasi', 'lemak']) await activate(button(new RegExp(`^${w}$`)));
    await press('Check');
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it('the same tile cannot be used twice', async () => {
    await view(ORDER);
    await activate(button(/^I$/));
    await activate(button(/^I$/));
    expect(screen.getAllByRole('button', { name: 'Remove I' })).toHaveLength(1);
  });
});

describe('fill in the blanks', () => {
  const FB = Q({ type: 'fillBlank', text: 'Ali ___ ke sekolah ___ bas.', blanks: ['pergi', 'naik'], bank: ['pergi', 'naik', 'makan'], lang: 'ms' });

  it('fills blanks in order and checks (Semak)', async () => {
    const onAnswer = await view(FB);
    expect(isDisabled('Semak')).toBe(true);
    await answerThroughUi(FB, true);
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('a filled blank can be cleared and refilled', async () => {
    const onAnswer = await view(FB);
    await activate(button(/^makan$/));
    await press('Blank 1');
    await activate(button(/^pergi$/));
    await activate(button(/^naik$/));
    await press('Semak');
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('a wrong word is wrong', async () => {
    const onAnswer = await view(FB);
    await answerThroughUi(FB, false);
    expect(onAnswer).toHaveBeenCalledWith(false);
  });
});

describe('sort', () => {
  const SORT = Q({
    type: 'sort',
    buckets: [
      { id: 'living', label: 'Living' },
      { id: 'non', label: 'Non-living' },
    ],
    items: [
      { text: 'Cat', bucket: 'living' },
      { text: 'Rock', bucket: 'non' },
      { text: 'Tree', bucket: 'living' },
    ],
  });

  it('places items with tap-then-bucket and reports a clean run as correct', async () => {
    const onAnswer = await view(SORT);
    await answerThroughUi(SORT, true);
    expect(onAnswer).toHaveBeenCalledWith(true);
    expect(screen.getByText('All sorted! ✨')).toBeOnTheScreen();
  });

  it('a wrong bucket bounces the item back and the run counts as a mistake', async () => {
    const onAnswer = await view(SORT);
    await activate(button(/^Rock$/));
    await press('Bucket Living');
    expect(button(/^Rock$/)).toBeOnTheScreen();
    expect(onAnswer).not.toHaveBeenCalled();
    await answerThroughUi(SORT, true);
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it('tapping a bucket with nothing selected does nothing', async () => {
    const onAnswer = await view(SORT);
    await press('Bucket Living');
    await act(async () => jest.advanceTimersByTime(1000));
    expect(onAnswer).not.toHaveBeenCalled();
    expect(within(button('Bucket Living')).queryByText('Cat')).toBeNull();
  });
});

describe('match', () => {
  const MATCH = Q({
    type: 'match',
    pairs: [
      { left: 'cat', right: 'kucing' },
      { left: 'dog', right: 'anjing' },
      { left: 'fish', right: 'ikan' },
    ],
  });

  it('pairs left and right items; a clean run is correct', async () => {
    const onAnswer = await view(MATCH);
    await answerThroughUi(MATCH, true);
    expect(onAnswer).toHaveBeenCalledWith(true);
  });

  it('a wrong pair counts as a mistake', async () => {
    const onAnswer = await view(MATCH);
    await answerThroughUi(MATCH, false);
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it('matched items are disabled and selecting the same item twice deselects it', async () => {
    await view(MATCH);
    const left = within(screen.getByTestId('match-left'));
    const right = within(screen.getByTestId('match-right'));
    await activate(left.getByRole('button', { name: 'cat' }));
    expect(left.getByRole('button', { name: 'cat' }).props.accessibilityState.selected).toBe(true);
    await activate(left.getByRole('button', { name: 'cat' }));
    expect(left.getByRole('button', { name: 'cat' }).props.accessibilityState.selected).toBe(false);
    await activate(left.getByRole('button', { name: 'cat' }));
    await activate(right.getByRole('button', { name: 'kucing' }));
    expect(left.getByRole('button', { name: 'cat' }).props.accessibilityState.disabled).toBe(true);
    expect(right.getByRole('button', { name: 'kucing' }).props.accessibilityState.disabled).toBe(true);
  });
});

describe('feedback sheet', () => {
  it('celebrates a correct answer with XP and combo', async () => {
    const onContinue = jest.fn();
    await render(<FeedbackSheet q={MCQ} correct xp={15} combo={4} onContinue={onContinue} />);
    expect(screen.getByText('+15 XP')).toBeOnTheScreen();
    expect(screen.getByText('🔥 4 in a row')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalled();
  });

  it('shows the right answer after a mistake, plus the explanation', async () => {
    await render(<FeedbackSheet q={{ ...MCQ, explain: 'Anjing means dog.' }} correct={false} xp={0} combo={0} onContinue={jest.fn()} />);
    expect(screen.getByText('Anjing')).toBeOnTheScreen();
    expect(screen.getByText(/Anjing means dog/)).toBeOnTheScreen();
  });

  it('promises a review when there is no single answer to show', async () => {
    await render(<FeedbackSheet q={Q({ type: 'match', pairs: [{ left: 'a', right: 'b' }, { left: 'c', right: 'd' }] })} correct={false} xp={0} combo={0} onContinue={jest.fn()} />);
    expect(screen.getByText(/practise this one again soon/)).toBeOnTheScreen();
  });
});
