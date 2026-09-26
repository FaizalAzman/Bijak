/**
 * The practice-sheet screen: behind the parent PIN, a topic (or the child's weak spots),
 * a size and an answer key, then print or share a PDF.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import Dashboard from '@/app/parent/dashboard';
import Report from '@/app/parent/report';
import Worksheet from '@/app/parent/worksheet';
import * as Toaster from '@/components/gamify/Toaster';
import { useParentSession } from '@/features/profile/parentSession';
import { telemetry } from '@/lib/telemetry';
import { useApp } from '@/store/app';
import { playQuiz, resetStores, setNow, setupChild } from '../helpers';

const s = () => useApp.getState();
const params = (p: Record<string, string>) => ((globalThis as { __routeParams?: object }).__routeParams = p);
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const printedHtml = () => (Print.printAsync as jest.Mock).mock.calls.at(-1)[0].html as string;

let toast: jest.SpyInstance;
beforeEach(() => {
  setNow('2026-03-02T17:00:00');
  resetStores();
  jest.clearAllMocks();
  params({});
  useParentSession.getState().unlock();
  toast = jest.spyOn(Toaster, 'toast').mockImplementation(() => undefined);
});
afterEach(() => {
  toast.mockRestore();
  useParentSession.getState().lock();
  jest.useRealTimers();
});

it('starts on the topic the class is on at school, and previews the sheet', async () => {
  const id = setupChild({ name: 'Adam' });
  s().setSchoolTopic(id, 'math', 's3-math-numbers');
  await render(<Worksheet />);
  expect(screen.getByRole('button', { name: /Numbers up to 10 000/ })).toBeSelected();
  expect(screen.getByText('Standard 3 · Mathematics · 10 questions')).toBeOnTheScreen();
  expect(screen.getAllByTestId(/^sheet-q-/)).toHaveLength(5);
  expect(screen.getByText('…and 5 more')).toBeOnTheScreen();
});

it('picking a subject jumps to its topic at school, else its first topic', async () => {
  const id = setupChild({ name: 'Adam' });
  s().setSchoolTopic(id, 'science', 's3-sci-plants');
  await render(<Worksheet />);
  expect(screen.getByRole('button', { name: /Plants/ })).toBeSelected();
  await tap(/ Mathematics$/);
  expect(screen.getByRole('button', { name: /Numbers up to 10 000/ })).toBeSelected();
  await tap(/ Science$/);
  expect(screen.getByRole('button', { name: /Plants/ })).toBeSelected();
});

it('offers the sizes a topic can fill, and “all” when it has fewer than 20', async () => {
  setupChild({ name: 'Adam' });
  params({ topic: 's3-math-numbers' }); // 24 questions
  const big = await render(<Worksheet />);
  expect(['10', '15', '20'].map((n) => screen.getByRole('button', { name: n }))).toHaveLength(3);
  await tap('20');
  expect(screen.getByText('…and 15 more')).toBeOnTheScreen();
  await big.unmount();
  params({ topic: 's3-math-money' }); // 13 questions
  await render(<Worksheet />);
  expect(screen.getByRole('button', { name: '10' })).toBeSelected();
  await tap('All 13');
  expect(screen.getByText(/· 13 questions$/)).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: '15' })).toBeNull();
  // A small topic offers just "all"; the chosen size carries over sensibly.
  await tap(/ Science$/);
  await tap(/Humans: Our Teeth/);
  expect(screen.getByRole('button', { name: 'All 6' })).toBeSelected();
  expect(screen.queryByText(/…and/)).toBeOnTheScreen();
});

it('prints the chosen topic on A4, with or without the answer key', async () => {
  setupChild({ name: 'Adam' });
  await render(<Worksheet />);
  // One subject's topics at a time.
  expect(screen.queryByRole('button', { name: /Humans: Our Teeth/ })).toBeNull();
  await tap(/ Science$/);
  expect(screen.queryByRole('button', { name: /Numbers up to 10 000/ })).toBeNull();
  await tap(/Humans: Our Teeth/);
  await tap('Print');
  expect(Print.printAsync).toHaveBeenCalledWith(expect.objectContaining({ width: 595, height: 842 }));
  expect(printedHtml()).toContain('Humans: Our Teeth');
  expect(printedHtml()).toContain('Name: Adam');
  expect(printedHtml()).toContain('<section class="key">');
  await fireEvent.press(screen.getByRole('switch', { name: 'Answer key on the last page' }));
  await tap('Print');
  expect(printedHtml()).not.toContain('<section class="key">');
  expect(telemetry.records().some((r) => r.kind === 'event' && r.name === 'worksheet')).toBe(true);
});

it('“New questions” draws a different set', async () => {
  setupChild({ name: 'Adam' });
  params({ topic: 's3-math-operations' });
  await render(<Worksheet />);
  const before = screen.getAllByTestId(/^sheet-q-/).map((el) => el.props.children);
  await fireEvent.press(screen.getByTestId('sheet-shuffle'));
  expect(screen.getAllByTestId(/^sheet-q-/).map((el) => el.props.children)).not.toEqual(before);
});

it('shares the sheet as a PDF', async () => {
  setupChild({ name: 'Adam' });
  await render(<Worksheet />);
  await tap('Share PDF');
  expect(Print.printToFileAsync).toHaveBeenCalled();
  expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/sheet.pdf', expect.objectContaining({ mimeType: 'application/pdf' }));
});

it('a failed print says so and is logged, not thrown', async () => {
  setupChild({ name: 'Adam' });
  (Print.printAsync as jest.Mock).mockRejectedValueOnce(new Error('no printer'));
  await render(<Worksheet />);
  await tap('Print');
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Couldn’t make the sheet. Please try again.' }));
  expect(telemetry.records().some((r) => r.kind === 'error' && r.name === 'no printer')).toBe(true);
});

it('offers the child’s weak spots together, as the report suggests', async () => {
  const id = setupChild({ name: 'Adam' });
  playQuiz('s3-math-time-q1', [false, false, true, false, false]);
  params({ child: id, topic: 'weak' });
  await render(<Worksheet />);
  expect(screen.getByRole('button', { name: '💡 Practise next (weak spots)' })).toBeSelected();
  expect(screen.getByText('Time')).toBeOnTheScreen();
});

it('without weak spots, “practise next” falls back to a topic', async () => {
  setupChild({ name: 'Adam' });
  params({ topic: 'weak' });
  await render(<Worksheet />);
  expect(screen.queryByRole('button', { name: /Practise next/ })).toBeNull();
  expect(screen.getAllByTestId(/^sheet-q-/).length).toBeGreaterThan(0);
});

it('a Bahasa Melayu–medium child gets a Bahasa Melayu sheet; the screen follows the app language', async () => {
  const id = setupChild({ name: 'Aina' });
  s().updateProfile(id, { medium: 'ms' });
  s().updateSettings({ uiLang: 'ms' });
  params({ topic: 's3-math-numbers' });
  await render(<Worksheet />);
  expect(screen.getByText('Nombor Bulat hingga 10 000')).toBeOnTheScreen();
  expect(screen.getByText('Tahun 3 · Matematik · 10 soalan')).toBeOnTheScreen();
  await tap('Cetak');
  expect(printedHtml()).toContain('Nama: Aina');
  expect(screen.getByRole('button', { name: 'Kongsi PDF' })).toBeOnTheScreen();
});

it('switches between children', async () => {
  setupChild({ name: 'Adam' });
  s().addProfile({ name: 'Aina', level: 1 });
  await render(<Worksheet />);
  await tap('Aina');
  expect(screen.getByText(/^Standard 1 · .* questions$/)).toBeOnTheScreen();
});

it('a topic without questions says so and cannot be printed', async () => {
  setupChild({ name: 'Adam' });
  params({ topic: 'no-such-topic' });
  await render(<Worksheet />);
  expect(screen.getByText('This topic has no questions yet.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Print' })).toBeDisabled();
});

it('without a learner it says so; it stays behind the parent PIN', async () => {
  const first = await render(<Worksheet />);
  expect(screen.getByText('No learner to set up yet.')).toBeOnTheScreen();
  await first.unmount();
  useParentSession.getState().lock();
  await render(<Worksheet />);
  expect(router.replace).toHaveBeenCalledWith('/parent');
});

it('the dashboard and the weekly report open it for the right child and topic', async () => {
  const id = setupChild({ name: 'Adam' });
  playQuiz('s3-math-time-q1', [false, false, true, false, false]);
  const dash = await render(<Dashboard />);
  await tap('Practice sheets');
  expect(router.push).toHaveBeenLastCalledWith(`/parent/worksheet?child=${id}`);
  await dash.unmount();
  setNow('2026-03-08T20:00:00');
  await render(<Report />);
  await tap('Print a practice sheet');
  expect(router.push).toHaveBeenLastCalledWith(`/parent/worksheet?child=${id}&topic=s3-math-time`);
});
