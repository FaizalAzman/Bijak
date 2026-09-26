import { act, renderHook } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';
import { getContentIndex, useContent, useContentIndex } from '@/features/content/registry';
import { useChildContent } from '@/hooks/useChildContent';
import { useLayout } from '@/hooks/useLayout';
import { useNow } from '@/hooks/useNow';
import { useActiveProfile, useApp, useProgress } from '@/store/app';
import { resetStores, setNow, setupChild } from '../helpers';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: jest.fn(() => ({ width: 390, height: 844, scale: 3, fontScale: 1 })) }));

beforeEach(() => {
  setNow('2026-03-02T09:00:00');
  resetStores();
});
afterEach(() => jest.useRealTimers());

it('useNow ticks on its interval and stops when unmounted', async () => {
  const { result, unmount } = await renderHook(() => useNow(1000));
  const start = result.current;
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(result.current).toBe(start + 1000);
  const clear = jest.spyOn(global, 'clearInterval');
  await unmount();
  expect(clear).toHaveBeenCalled();
});

it('useLayout follows the window size', async () => {
  const { result } = await renderHook(() => useLayout('wide'));
  expect(result.current).toMatchObject({ width: 390, isTablet: false, innerWidth: 354 });
  (useWindowDimensions as jest.Mock).mockReturnValue({ width: 1180, height: 820, scale: 2, fontScale: 1 });
  const tablet = await renderHook(() => useLayout('wide'));
  expect(tablet.result.current).toMatchObject({ isTablet: true, landscape: true, innerWidth: 1040 - 56 });
});

it('useActiveProfile / useProgress follow the selected child and never return undefined progress', async () => {
  const hook = await renderHook(() => ({ profile: useActiveProfile(), progress: useProgress() }));
  expect(hook.result.current.profile).toBeUndefined();
  expect(hook.result.current.progress.coins).toBe(50);
  await act(async () => {
    setupChild({ name: 'Aisyah' });
  });
  expect(hook.result.current.profile?.name).toBe('Aisyah');
  await act(async () => {
    useApp.getState().buy('tee-sky');
  });
  expect(hook.result.current.progress.coins).toBe(10);
});

it('useContentIndex updates when remote content arrives', async () => {
  const hook = await renderHook(() => useContentIndex());
  const first = hook.result.current;
  expect(first.standardByLevel(3)).toBeDefined();
  await act(async () => {
    useContent.setState({ remote: {} });
  });
  expect(hook.result.current).not.toBe(first);
});

it('useChildContent shows Maths & Science in the active child’s teaching language', async () => {
  const hook = await renderHook(() => useChildContent());
  // Nobody signed in (or an older save without a language): the original syllabus.
  expect(hook.result.current.topic('s3-math-money')?.topic.title).toBe('Money up to RM1000');
  let id = '';
  await act(async () => {
    id = setupChild();
  });
  await act(async () => useApp.getState().updateProfile(id, { medium: 'ms' }));
  expect(hook.result.current.topic('s3-math-money')?.topic.title).toBe('Wang hingga RM1000');
  // English lessons stay in English.
  const english = getContentIndex().topic('s3-eng-animals')!.topic;
  expect(hook.result.current.topic('s3-eng-animals')?.topic).toBe(english);
  await act(async () => useApp.getState().updateProfile(id, { medium: 'en' }));
  expect(hook.result.current.topic('s3-math-money')?.topic.title).toBe('Money up to RM1000');
});
