import { fireEvent, render, screen, within } from '@testing-library/react-native';
import Shop from '@/app/(tabs)/shop';
import * as Toaster from '@/components/gamify/Toaster';
import { itemById } from '@/features/gamify/shop';
import { xpForLevel } from '@/features/gamify/xp';
import { useApp } from '@/store/app';
import { patchProgress, progressOf, resetStores, setNow, setupChild } from '../helpers';

const s = () => useApp.getState();
const avatar = () => s().profiles.find((p) => p.id === s().activeProfileId)!.avatar;
const tap = async (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const tab = (name: string) => tap(new RegExp(`^${name}`));
const buy = () => screen.getByTestId('buy');

let toast: jest.SpyInstance;
beforeEach(() => {
  setNow('2026-03-02T09:00:00');
  resetStores();
  setupChild({ level: 3 });
  toast = jest.spyOn(Toaster, 'toast').mockImplementation(() => undefined);
});
afterEach(() => {
  toast.mockRestore();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('shop preview', () => {
  it('starts by showing the coin balance', async () => {
    await render(<Shop />);
    expect(screen.getByText('Your coins')).toBeOnTheScreen();
    expect(within(screen.getByTestId('coin-pill')).getByText('50')).toBeOnTheScreen();
  });

  const onScreen = (width: number, height: number) =>
    jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({ width, height, scale: 2, fontScale: 1 });

  it('on phones, Buy and Cancel get their own row under the avatar (never squeezed or stretched tall)', async () => {
    onScreen(360, 740);
    await render(<Shop />);
    await tap('Sky Tee');
    const buyCell = buy().parent!;
    const actionRow = buyCell.parent!;
    expect(within(actionRow).getByTestId('cancel-preview')).toBeOnTheScreen();
    expect(buyCell.props.style).toMatchObject({ flex: 1 });
    // The row is a sibling of the avatar row, not inside the narrow text column.
    expect(within(actionRow.parent!).getByText('Trying on')).toBeOnTheScreen();
    expect(within(screen.getByText('Trying on').parent!).queryByTestId('buy')).toBeNull();
    expect(screen.getByTestId('buy-label').props.numberOfLines).toBe(1);
  });

  it('on tablets, the actions sit beside the avatar under the text, capped so Buy is not a giant bar', async () => {
    onScreen(1180, 820);
    await render(<Shop />);
    await tap('Sky Tee');
    const actionRow = buy().parent!.parent!;
    expect(actionRow.props.style).toMatchObject({ maxWidth: 440 });
    expect(within(screen.getByText('Trying on').parent!).getByTestId('buy')).toBeOnTheScreen();
    expect(screen.getByTestId('buy-label').props.numberOfLines).toBe(1);
  });

  it('buys, pays, equips and celebrates', async () => {
    await render(<Shop />);
    await tap('Sky Tee');
    expect(screen.getByText('Trying on')).toBeOnTheScreen();
    expect(screen.getByTestId('preview-status')).toHaveTextContent('🪙 40 coins');
    expect(screen.getByTestId('buy-label')).toHaveTextContent('Buy · 40 🪙');
    await fireEvent.press(buy());
    expect(progressOf().coins).toBe(10);
    expect(progressOf().inventory).toContain('tee-sky');
    expect(avatar().outfit).toBe('tee-sky');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sky Tee unlocked!' }));
    expect(screen.queryByText('Trying on')).toBeNull();
    expect(screen.getByText('Equipped ✓')).toBeOnTheScreen();
  });

  it('cannot buy without enough coins, and says how many are missing', async () => {
    await render(<Shop />);
    await tap('Grape Hoodie');
    expect(screen.getByTestId('preview-status')).toHaveTextContent(`Need ${itemById('hoodie-grape')!.price - 50} more coins`);
    expect(buy()).toBeDisabled();
    await fireEvent.press(buy());
    expect(progressOf().inventory).not.toContain('hoodie-grape');
    expect(progressOf().coins).toBe(50);
  });

  it('level-locked items say so and cannot be bought even with coins', async () => {
    patchProgress({ coins: 5000 });
    await render(<Shop />);
    await tab('Backgrounds');
    await tap('Outer Space');
    expect(screen.getByTestId('preview-status')).toHaveTextContent('🔒 Unlocks at level 4');
    expect(screen.getByTestId('buy-label')).toHaveTextContent('Level 4 needed');
    expect(buy()).toBeDisabled();
    await fireEvent.press(buy());
    expect(progressOf().inventory).not.toContain('bg-space');
  });

  it('unlocks at the right level', async () => {
    patchProgress({ coins: 5000, xp: xpForLevel(4) });
    await render(<Shop />);
    await tab('Backgrounds');
    await tap('Outer Space');
    await fireEvent.press(buy());
    expect(progressOf().inventory).toContain('bg-space');
    expect(avatar().bg).toBe('bg-space');
  });

  it('Cancel closes the preview without buying', async () => {
    await render(<Shop />);
    await tap('Sky Tee');
    await fireEvent.press(screen.getByTestId('cancel-preview'));
    expect(screen.queryByText('Trying on')).toBeNull();
    expect(progressOf().coins).toBe(50);
  });

  it('switching tabs closes the preview', async () => {
    await render(<Shop />);
    await tap('Sky Tee');
    await tab('Hats');
    expect(screen.queryByText('Trying on')).toBeNull();
  });
});

describe('wearing owned items', () => {
  it('accessories toggle on and off', async () => {
    patchProgress((p) => p.inventory.push('cap-red'));
    await render(<Shop />);
    await tab('Hats');
    await tap('Red Cap');
    expect(avatar().hat).toBe('cap-red');
    expect(screen.getByText('Equipped ✓')).toBeOnTheScreen();
    await tap('Red Cap');
    expect(avatar().hat).toBeUndefined();
    expect(screen.getByText('Tap to wear')).toBeOnTheScreen();
  });

  it('the outfit stays on when tapped again (never left without clothes)', async () => {
    await render(<Shop />);
    await tap('Lime Tee');
    expect(avatar().outfit).toBe('tee-lime');
  });

  it('locked tiles show the level needed', async () => {
    await render(<Shop />);
    await tab('Pets');
    expect(within(screen.getByRole('button', { name: 'Baby Dragon' })).getByText('Level 10')).toBeOnTheScreen();
  });
});

describe('arcade games', () => {
  it('can be opened straight from a locked arcade card and unlocked', async () => {
    (globalThis as { __routeParams?: object }).__routeParams = { tab: 'games' };
    patchProgress({ coins: 150 });
    await render(<Shop />);
    expect(screen.getByTestId('unlock-s3-arcade-divide')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('unlock-s3-arcade-words'));
    expect(progressOf().coins).toBe(30);
    expect(progressOf().inventory).toContain('arcade:s3-arcade-words');
    expect(screen.getByText('Unlocked ✓')).toBeOnTheScreen();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('unlocked!') }));
  });

  it('ignores an unknown tab in the link', async () => {
    (globalThis as { __routeParams?: object }).__routeParams = { tab: 'nonsense' };
    await render(<Shop />);
    expect(screen.getByRole('button', { name: 'Sky Tee' })).toBeOnTheScreen();
  });
});
