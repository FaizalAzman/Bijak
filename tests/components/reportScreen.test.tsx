/**
 * The weekly report screen: behind the parent PIN, one child at a time, and shareable on
 * WhatsApp (or anywhere through the share sheet).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking, Share } from 'react-native';
import Dashboard from '@/app/parent/dashboard';
import Report from '@/app/parent/report';
import { useParentSession } from '@/features/profile/parentSession';
import { telemetry } from '@/lib/telemetry';
import { useApp } from '@/store/app';
import { playQuiz, resetStores, setNow, setupChild } from '../helpers';

const s = () => useApp.getState();
const params = (p: Record<string, string>) => ((globalThis as { __routeParams?: object }).__routeParams = p);
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(() => {
  setNow('2026-03-08T20:00:00');
  resetStores();
  jest.clearAllMocks();
  params({});
  useParentSession.getState().unlock();
});
afterEach(() => {
  useParentSession.getState().lock();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('shows the child’s week at a glance', async () => {
  const id = setupChild({ name: 'Adam' });
  s().setSchoolTopic(id, 'math', 's3-math-fractions');
  playQuiz('s3-math-fractions-q1', undefined, { seconds: 600 });
  params({ child: id });
  await render(<Report />);
  expect(screen.getByText('Adam’s week')).toBeOnTheScreen();
  expect(screen.getByText('2 Mar – 8 Mar')).toBeOnTheScreen();
  expect(screen.getByText('10 min')).toBeOnTheScreen();
  expect(screen.getByText('1 / 7')).toBeOnTheScreen();
  expect(screen.getByText('100%')).toBeOnTheScreen();
  expect(screen.getByText('🔥 1-day streak (best 1)')).toBeOnTheScreen();
  expect(screen.getByText(/Fractions, Decimals & Percent · Mathematics/)).toBeOnTheScreen();
  expect(screen.getByText('Mastered ✓')).toBeOnTheScreen();
  expect(screen.getByText(/🔢 Mathematics · 10 min/)).toBeOnTheScreen();
  expect(screen.getByText('Nothing stands out — keep going! 🎉')).toBeOnTheScreen();
  expect(screen.getByTestId('share-preview')).toHaveTextContent(/^📊 \*Adam’s week on Bijak\*/);
  await tap('Set school topics');
  expect(router.push).toHaveBeenCalledWith(`/parent/school?child=${id}`);
});

it('reads in Bahasa Melayu, and shares in Bahasa Melayu, when the app is in Malay', async () => {
  const id = setupChild({ name: 'Adam' });
  s().setSchoolTopic(id, 'math', 's3-math-fractions');
  playQuiz('s3-math-fractions-q1', undefined, { seconds: 600 });
  s().updateSettings({ uiLang: 'ms' });
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await render(<Report />);
  expect(screen.getByText('Minggu Adam')).toBeOnTheScreen();
  expect(screen.getByText('2 Mac – 8 Mac')).toBeOnTheScreen();
  expect(screen.getByText('🔥 Rentetan 1 hari (terbaik 1)')).toBeOnTheScreen();
  expect(screen.getByText(/Fractions, Decimals & Percent · Matematik/)).toBeOnTheScreen();
  expect(screen.getByText('Dikuasai ✓')).toBeOnTheScreen();
  expect(screen.getByTestId('share-preview')).toHaveTextContent(/^📊 \*Minggu Adam di Bijak\*/);
  await tap('Kongsi di WhatsApp');
  expect(decodeURIComponent(open.mock.calls[0][0])).toContain('_Dihantar dari Bijak_');
});

it('a quiet week has friendly empty states', async () => {
  setupChild({ name: 'Aina' });
  await render(<Report />);
  expect(screen.getByText('Best streak so far: 0 days')).toBeOnTheScreen();
  expect(screen.getByText(/No new topics mastered this week/)).toBeOnTheScreen();
  expect(screen.getByText(/Tell Bijak which topics the class is on/)).toBeOnTheScreen();
  expect(screen.queryByText('Time by subject')).toBeNull();
  // No answers means no accuracy, rather than a misleading 0%.
  expect(screen.getByText('–')).toBeOnTheScreen();
  expect(screen.getByText('last week –')).toBeOnTheScreen();
});

it('lists what to practise next, with something to try at home', async () => {
  setupChild({ name: 'Adam' });
  playQuiz('s3-math-time-q1', [false, false, true, false, false], { seconds: 300 });
  await render(<Report />);
  expect(screen.getByText(/Time · 20% correct/)).toBeOnTheScreen();
  expect(screen.getByText(/^Try at home: Give him a real clock/)).toBeOnTheScreen();
});

it('switches between children', async () => {
  setupChild({ name: 'Adam' });
  s().addProfile({ name: 'Aina', level: 2 });
  await render(<Report />);
  expect(screen.getByText('Adam’s week')).toBeOnTheScreen();
  await tap('Aina');
  expect(screen.getByText('Aina’s week')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Aina' })).toBeSelected();
});

it('shares on WhatsApp or through the share sheet', async () => {
  setupChild({ name: 'Adam' });
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  const event = jest.spyOn(telemetry, 'event');
  await render(<Report />);
  const text = screen.getByTestId('share-preview').props.children as string;
  await tap('Share on WhatsApp');
  expect(open).toHaveBeenCalledWith(`https://wa.me/?text=${encodeURIComponent(text)}`);
  await tap('Share…');
  expect(share).toHaveBeenCalledWith({ message: text });
  expect(event.mock.calls.filter(([name]) => name === 'report_shared')).toEqual([
    ['report_shared', { how: 'whatsapp' }],
    ['report_shared', { how: 'other' }],
  ]);
});

it('a failed share is logged, not thrown', async () => {
  setupChild({ name: 'Adam' });
  jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no WhatsApp'));
  const error = jest.spyOn(telemetry, 'error').mockImplementation(() => undefined);
  await render(<Report />);
  await tap('Share on WhatsApp');
  expect(error).toHaveBeenCalledWith(expect.any(Error), { where: 'report-share' });
});

it('without a learner it says what to do', async () => {
  s().setupFamily('Parent');
  await render(<Report />);
  expect(screen.getByText('Add a learner to see their weekly report.')).toBeOnTheScreen();
});

it('stays behind the parent PIN', async () => {
  useParentSession.getState().lock();
  setupChild();
  await render(<Report />);
  expect(router.replace).toHaveBeenCalledWith('/parent');
  expect(screen.queryByText(/’s week/)).toBeNull();
});

it('the dashboard opens the report for the selected child', async () => {
  const id = setupChild({ name: 'Adam' });
  await render(<Dashboard />);
  await tap('Weekly report');
  expect(router.push).toHaveBeenCalledWith(`/parent/report?child=${id}`);
});
