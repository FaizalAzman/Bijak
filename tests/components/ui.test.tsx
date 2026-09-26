import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { QuestRow } from '@/components/gamify/QuestRow';
import { Results, type ResultsData } from '@/components/quiz/Results';
import { Button, Chip, FrameContext, Grid, Keypad, Toggle, Txt } from '@/components/ui';
import { Question } from '@/features/content/schema';
import { computeLayout } from '@/hooks/useLayout';
import * as feedback from '@/lib/feedback';
import { useApp } from '@/store/app';
import { resetStores } from '../helpers';

beforeEach(() => resetStores());

const flat = (el: { props: { style?: unknown } }) => (StyleSheet.flatten(el.props.style as StyleProp<ViewStyle>) ?? {}) as Record<string, unknown>;

describe('Button', () => {
  it('keeps its label on one line so it can never grow tall and narrow', async () => {
    await render(<Button label="Buy · 250 🪙" onPress={jest.fn()} testID="buy" />);
    const label = screen.getByTestId('buy-label');
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    expect(label.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.2);
  });

  it('is pressable, and not when disabled or loading', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<Button label="Go" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Go' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    await rerender(<Button label="Go" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Go' }));
    await rerender(<Button label="Go" onPress={onPress} loading />);
    await fireEvent.press(screen.getByRole('button', { name: 'Go' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
  });

  it.each([
    [{ full: true }, 'stretch'],
    [{}, 'flex-start'],
    [{ align: 'center' as const }, 'center'],
  ])('%p aligns itself %s and never overflows its row', async (props, alignSelf) => {
    await render(<Button label="X" {...props} testID="b" />);
    const style = flat(screen.getByTestId('b'));
    expect(style.alignSelf).toBe(alignSelf);
    expect(style.maxWidth).toBe('100%');
  });
});

describe('Txt', () => {
  it('gives custom font sizes a safe line height so emoji are not clipped', async () => {
    await render(<Txt style={{ fontSize: 40 }}>🏆</Txt>);
    expect(flat(screen.getByText('🏆')).lineHeight).toBe(52);
  });

  it('keeps an explicit line height', async () => {
    await render(<Txt style={{ fontSize: 40, lineHeight: 44 }}>A</Txt>);
    expect(flat(screen.getByText('A')).lineHeight).toBe(44);
  });

  it('keeps grouped numbers together and limits font scaling', async () => {
    await render(<Txt testID="t">Score 10 000</Txt>);
    const t = screen.getByTestId('t');
    expect(t.props.children).toBe('Score 10 000');
    expect(t.props.maxFontSizeMultiplier).toBe(1.4);
  });
});

describe('Grid', () => {
  const tiles = (n: number) => Array.from({ length: n }, (_, i) => <Text key={`t${i}`}>{`tile ${i}`}</Text>);
  const columnsAt = async (width: number, min: number, max?: number) => {
    await render(
      <FrameContext.Provider value={{ ...computeLayout(390, 844, 'wide'), innerWidth: width }}>
        <Grid minItemWidth={min} maxColumns={max} gap={12}>
          {tiles(6)}
        </Grid>
      </FrameContext.Provider>,
    );
    const cell = screen.getByText('tile 0').parent as unknown as { props: { style?: unknown } };
    return Math.round((width + 12) / ((flat(cell).width as number) + 12));
  };

  it.each([
    [320, 150, 4, 2],
    [354, 150, 4, 2],
    [700, 150, 4, 4],
    [984, 140, 5, 5],
    [984, 420, 2, 2],
    [300, 420, 2, 1],
  ])('%ipx wide, min %ipx, max %i → %i columns', async (width, min, max, expected) => {
    expect(await columnsAt(width, min, max)).toBe(expected);
  });
});

describe('Chip, Toggle, Keypad', () => {
  it('chips expose their selected state', async () => {
    await render(<Chip label="Hats" selected onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: /Hats/ })).toBeSelected();
  });

  it('toggles are switches with a checked state', async () => {
    const onChange = jest.fn();
    await render(<Toggle label="Sound" value={false} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('switch', { name: 'Sound' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('the keypad sends digits, delete and the optional extra key', async () => {
    const onKey = jest.fn();
    await render(<Keypad onKey={onKey} extraKey="." />);
    for (const k of ['7', '0', '.', 'Delete']) await fireEvent.press(screen.getByRole('button', { name: k }));
    expect(onKey.mock.calls.map((c) => c[0])).toEqual(['7', '0', '.', 'del']);
  });

  it('a disabled keypad sends nothing', async () => {
    const onKey = jest.fn();
    await render(<Keypad onKey={onKey} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: '5' }));
    expect(onKey).not.toHaveBeenCalled();
  });
});

describe('QuestRow', () => {
  const quest = { id: 'q', kind: 'correct' as const, title: 'Get 15 answers right', emoji: '✅', target: 15, progress: 4, reward: 30, claimed: false };

  it('shows progress and the reward while in progress', async () => {
    await render(<QuestRow quest={quest} onClaim={jest.fn()} />);
    expect(screen.getByText('4/15')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: '+30 🪙' })).toBeNull();
  });

  it('offers a claim button once complete', async () => {
    const onClaim = jest.fn();
    await render(<QuestRow quest={{ ...quest, progress: 15 }} onClaim={onClaim} />);
    await fireEvent.press(screen.getByRole('button', { name: '+30 🪙' }));
    expect(onClaim).toHaveBeenCalled();
  });

  it('shows a tick once claimed', async () => {
    await render(<QuestRow quest={{ ...quest, progress: 15, claimed: true }} onClaim={jest.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('icon-Check')).toBeOnTheScreen();
  });
});

describe('Results', () => {
  const data = (over: Partial<ResultsData>): ResultsData => ({ title: 'Quiz', timeAttack: false, correct: 8, total: 8, xp: 110, coins: 23, seconds: 75, streak: 2, newBest: false, badges: [], mistakes: [], ...over });
  const shows = async (d: ResultsData) => {
    await render(<Results data={d} onDone={jest.fn()} onRetry={jest.fn()} />);
    return { headline: screen.getByText(/score!|done!|effort!|practising!|up!/).props.children, stars: screen.getByTestId('stars').props.accessibilityLabel };
  };

  it.each([
    [8, 8, 'Perfect score!', '3 of 3 stars'],
    [6, 8, 'Well done!', '2 of 3 stars'],
    [4, 8, 'Good effort!', '1 of 3 stars'],
    [1, 8, 'Keep practising!', '1 of 3 stars'],
    [0, 8, 'Keep practising!', '0 of 3 stars'],
  ])('%i/%i → %s with %s', async (correct, total, headline, stars) => {
    expect(await shows(data({ correct, total }))).toEqual({ headline, stars });
  });

  it.each([
    [36, true, 'New best score!', '3 of 3 stars'],
    [20, false, 'Time’s up!', '2 of 3 stars'],
    [3, false, 'Time’s up!', '1 of 3 stars'],
  ])('time attack %i (new best %s) → %s with %s', async (correct, newBest, headline, stars) => {
    expect(await shows(data({ timeAttack: true, correct, total: correct + 2, newBest }))).toEqual({ headline, stars });
  });

  it('shows the earned XP, coins, time, streak and new badges', async () => {
    await render(
      <Results
        data={data({ badges: [{ id: 'first-quiz', title: 'First Steps', description: 'd', emoji: '👣', color: 'lime', earned: () => true }] })}
        onDone={jest.fn()}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.getByText('+110')).toBeOnTheScreen();
    expect(screen.getByText('+23')).toBeOnTheScreen();
    expect(screen.getByText('⏱ 1m')).toBeOnTheScreen();
    expect(screen.getByText('🔥 2-day streak')).toBeOnTheScreen();
    expect(screen.getByText('First Steps')).toBeOnTheScreen();
  });

  it('announces a rest-day shield earned on a streak milestone', async () => {
    await render(<Results data={data({ shieldEarned: true })} onDone={jest.fn()} onRetry={jest.fn()} />);
    expect(screen.getByTestId('shield-earned')).toHaveTextContent('🛡️ You earned a rest-day shield!');
  });

  describe('looking back at mistakes', () => {
    const q = (over: object) => Question.parse({ id: 'm', prompt: 'How many legs does a spider have?', explain: 'Spiders have 8 legs; insects have 6.', ...over });
    const mcq = q({ type: 'mcq', visual: '🕷️', options: [{ id: 'a', text: '6' }, { id: 'b', text: '8' }], answer: 'b' });
    const sort = q({
      id: 's',
      type: 'sort',
      prompt: 'Living or non-living?',
      explain: undefined,
      buckets: [
        { id: 'l', label: 'Living', emoji: '🌱' },
        { id: 'n', label: 'Non-living' },
      ],
      items: [
        { text: 'Cat', bucket: 'l' },
        { text: 'Rock', bucket: 'n' },
        { text: 'Tree', bucket: 'l' },
      ],
    });

    it('a perfect quiz has nothing to look back at', async () => {
      await render(<Results data={data({})} onDone={jest.fn()} onRetry={jest.fn()} />);
      expect(screen.queryByTestId('see-mistakes')).toBeNull();
    });

    it('lists each missed question with its right answer and why, then goes back', async () => {
      await render(<Results data={data({ correct: 6, mistakes: [mcq, sort] })} onDone={jest.fn()} onRetry={jest.fn()} />);
      await fireEvent.press(screen.getByRole('button', { name: 'Mistakes (2)' }));
      expect(screen.getByText('Let’s fix these')).toBeOnTheScreen();
      expect(screen.getByText('How many legs does a spider have?')).toBeOnTheScreen();
      expect(screen.getByText('8')).toBeOnTheScreen();
      expect(screen.getByText('💡 Spiders have 8 legs; insects have 6.')).toBeOnTheScreen();
      expect(screen.getByText('🌱 Living: Cat, Tree')).toBeOnTheScreen();
      expect(screen.getByText('Non-living: Rock')).toBeOnTheScreen();
      expect(screen.getAllByText('Right answer')).toHaveLength(2);
      await fireEvent.press(screen.getByRole('button', { name: 'Back to results' }));
      expect(screen.getByTestId('stars')).toBeOnTheScreen();
    });

    it('reads a mistake aloud, question and answer, in its own language', async () => {
      const speak = jest.spyOn(feedback, 'speak').mockImplementation(() => undefined);
      await render(<Results data={data({ correct: 7, mistakes: [q({ type: 'trueFalse', lang: 'ms', prompt: 'Labah-labah ada 6 kaki.', answer: false })] })} onDone={jest.fn()} onRetry={jest.fn()} />);
      await fireEvent.press(screen.getByTestId('see-mistakes'));
      expect(screen.getByText('Jawapan betul')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Baca soalan dengan kuat' }));
      expect(speak).toHaveBeenCalledWith('Labah-labah ada 6 kaki. Jawapan betul: Salah.', 'ms');
      speak.mockRestore();
    });

    it('“Mistakes” and “Play again” sit side by side where they fit, and stack on the smallest phones', async () => {
      const row = async (width: number, height: number) => {
        const view = await render(
          <FrameContext.Provider value={computeLayout(width, height, 'reading')}>
            <Results data={data({ correct: 7, mistakes: [mcq] })} onDone={jest.fn()} onRetry={jest.fn()} />
          </FrameContext.Provider>,
        );
        let node = screen.getByTestId('see-mistakes').parent;
        while (node && flat(node).flexDirection === undefined) node = node.parent;
        const direction = node && flat(node).flexDirection;
        await view.unmount();
        return direction;
      };
      expect(await row(320, 568)).toBe('column');
      expect(await row(360, 740)).toBe('row');
      expect(await row(1180, 820)).toBe('row');
    });

    it('the screen words follow the app language', async () => {
      useApp.getState().updateSettings({ uiLang: 'ms' });
      await render(<Results data={data({ correct: 7, mistakes: [mcq] })} onDone={jest.fn()} onRetry={jest.fn()} />);
      await fireEvent.press(screen.getByRole('button', { name: 'Kesilapan (1)' }));
      expect(screen.getByText('Jom betulkan')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Kembali ke keputusan' })).toBeOnTheScreen();
    });
  });

  it('continue and play again call back', async () => {
    const onDone = jest.fn();
    const onRetry = jest.fn();
    await render(<Results data={data({})} onDone={onDone} onRetry={onRetry} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Play again' }));
    expect(onDone).toHaveBeenCalled();
    expect(onRetry).toHaveBeenCalled();
  });
});

it('View import keeps RN mocks honest', () => {
  expect(View).toBeDefined();
});
