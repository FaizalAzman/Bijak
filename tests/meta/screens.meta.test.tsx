/**
 * Every screen (and layout) renders with a realistic family, for phones and tablets:
 * no crashes, no "undefined"/"NaN" leaking into the UI, and every button has a name
 * a screen reader can announce. The list is checked against the files in src/app.
 */
import { render, screen } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';
import { AppState } from 'react-native';
import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useParentSession } from '@/features/profile/parentSession';
import { telemetry } from '@/lib/telemetry';
import { useApp } from '@/store/app';
import { authoredQuiz, playQuiz, resetStores, setNow, setupChild } from '../helpers';
import { rel, screens } from './files';

type Json = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;
const texts = (node: Json): string[] =>
  node == null ? [] : typeof node === 'string' ? [node] : Array.isArray(node) ? node.flatMap(texts) : (node.children ?? []).flatMap((c) => texts(c as Json));

const SCREENS: Record<string, { params?: Record<string, string>; parent?: boolean; redirects?: boolean }> = {
  'src/app/(tabs)/home.tsx': {},
  'src/app/(tabs)/learn.tsx': {},
  'src/app/(tabs)/me.tsx': {},
  'src/app/(tabs)/quests.tsx': {},
  'src/app/(tabs)/shop.tsx': {},
  'src/app/+not-found.tsx': {},
  'src/app/avatar.tsx': {},
  'src/app/index.tsx': { redirects: true },
  'src/app/lesson/[topicId].tsx': { params: { topicId: 's3-math-fractions' } },
  'src/app/onboarding.tsx': {},
  'src/app/parent/children.tsx': { parent: true },
  'src/app/parent/content.tsx': { parent: true },
  'src/app/parent/dashboard.tsx': { parent: true },
  'src/app/parent/health.tsx': { parent: true },
  'src/app/parent/index.tsx': {},
  'src/app/parent/settings.tsx': { parent: true },
  'src/app/profiles.tsx': {},
  'src/app/quiz/[quizId].tsx': { params: { quizId: 's3-math-numbers-q1' } },
  'src/app/subject/[standardId]/[subjectId].tsx': { params: { standardId: 'std3', subjectId: 'science' } },
  'src/app/topic/[topicId].tsx': { params: { topicId: 's3-sci-teeth' } },
  'src/app/trophies.tsx': {},
};

function seedFamily() {
  resetStores();
  setupChild({ name: 'Adam', level: 3 });
  const quiz = authoredQuiz().quiz.id;
  playQuiz(quiz, [true, false, true, true, false, true, true, true]);
  useApp.getState().finishLesson({ topicId: 's3-math-fractions', seconds: 200 });
  useApp.getState().buy('tee-sky');
  useApp.getState().addProfile({ name: 'Aisyah', level: 1 });
}

beforeEach(() => {
  setNow('2026-03-04T17:00:00');
  seedFamily();
});
afterEach(() => {
  useParentSession.getState().lock();
  jest.useRealTimers();
});

it('the list covers every route file in src/app', () => {
  expect(Object.keys(SCREENS).sort()).toEqual(screens().map(rel).sort());
});

describe.each(Object.entries(SCREENS))('%s', (file, cfg) => {
  const load = () => require(`../../${file}`).default as React.ComponentType;

  it.each([
    ['phone', 390, 844],
    ['tablet', 1180, 820],
  ])('renders cleanly on a %s', async (_, width, height) => {
    jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({ width, height, scale: 2, fontScale: 1 });
    (globalThis as { __routeParams?: object }).__routeParams = cfg.params ?? {};
    if (cfg.parent) useParentSession.getState().unlock();
    const Screen = load();
    await render(<Screen />);
    if (cfg.redirects) {
      expect((Redirect as unknown as jest.Mock).mock.calls.length).toBeGreaterThan(0);
      return;
    }
    const json = screen.toJSON() as Json;
    expect(json).not.toBeNull();
    const all = texts(json).join(' | ');
    expect(all).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
    const buttons = screen.queryAllByRole('button');
    const named = screen.queryAllByRole('button', { name: /\S/ });
    expect(named.length).toBe(buttons.length);
  });
});

describe('entry gate', () => {
  const Index = () => require('../../src/app/index.tsx').default;
  const lastRedirect = () => (Redirect as unknown as jest.Mock).mock.calls.at(-1)?.[0].href;

  it('sends a new install to onboarding, a family without a chosen child to the picker, else home', async () => {
    const Gate = Index();
    const visit = async () => {
      const view = await render(<Gate />);
      const href = lastRedirect();
      await view.unmount();
      return href;
    };
    resetStores();
    expect(await visit()).toBe('/onboarding');
    useApp.getState().setupFamily('Mum');
    useApp.getState().addProfile({ name: 'Adam', level: 3 });
    expect(await visit()).toBe('/profiles');
    useApp.getState().selectProfile(useApp.getState().profiles[0].id);
    expect(await visit()).toBe('/home');
  });

  it('a removed child sends the family back to the picker', async () => {
    const Gate = Index();
    useApp.setState({ activeProfileId: 'deleted-child' });
    await render(<Gate />);
    expect(lastRedirect()).toBe('/profiles');
  });
});

describe('layouts', () => {
  it('the tab layout refreshes daily quests on launch and whenever the app comes back to the foreground', async () => {
    const Tabs = require('../../src/app/(tabs)/_layout.tsx').default;
    const listeners: ((s: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, fn) => {
      listeners.push(fn as (s: string) => void);
      return { remove: jest.fn() } as never;
    });
    const ensure = jest.fn();
    useApp.setState({ ensureToday: ensure });
    await render(<Tabs />);
    expect(screen.getByTestId('tabs')).toBeOnTheScreen();
    expect(['home', 'learn', 'quests', 'shop', 'me'].every((t) => screen.getByTestId(`tab-${t}`))).toBe(true);
    expect(ensure).toHaveBeenCalledTimes(1);
    listeners.forEach((l) => l('background'));
    expect(ensure).toHaveBeenCalledTimes(1);
    listeners.forEach((l) => l('active'));
    expect(ensure).toHaveBeenCalledTimes(2);
  });

  it('the tab layout sends a family with no active child back to the start', async () => {
    const Tabs = require('../../src/app/(tabs)/_layout.tsx').default;
    useApp.setState({ activeProfileId: null });
    await render(<Tabs />);
    expect((Redirect as unknown as jest.Mock).mock.calls.at(-1)?.[0].href).toBe('/');
  });

  it('the parent layout renders its stack', async () => {
    const Parent = require('../../src/app/parent/_layout.tsx').default;
    await render(<Parent />);
    expect(screen.toJSON()).toBeNull();
  });

  it('the root layout hides the splash screen once fonts load and shows the navigator', async () => {
    const Root = require('../../src/app/_layout.tsx').default;
    await render(<Root />);
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('keeps the splash screen up while fonts are loading', async () => {
    const fonts = require('expo-font');
    (fonts.useFonts as jest.Mock).mockReturnValueOnce([false, null]);
    (SplashScreen.hideAsync as jest.Mock).mockClear();
    const Root = require('../../src/app/_layout.tsx').default;
    await render(<Root />);
    expect(screen.toJSON()).toBeNull();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it('the error boundary tells the grown-ups and offers a retry', async () => {
    const { ErrorBoundary } = require('../../src/app/_layout.tsx');
    const retry = jest.fn();
    await render(<ErrorBoundary error={new Error('kaboom')} retry={retry} />);
    expect(screen.getByText('Oops! Something tripped.')).toBeOnTheScreen();
    expect(telemetry.records().some((r) => r.kind === 'error' && r.name === 'kaboom')).toBe(true);
    const { fireEvent } = require('@testing-library/react-native');
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });
});
