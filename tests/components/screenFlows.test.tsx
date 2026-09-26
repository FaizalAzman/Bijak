import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import AvatarScreen from '@/app/avatar';
import Home from '@/app/(tabs)/home';
import Learn from '@/app/(tabs)/learn';
import Me from '@/app/(tabs)/me';
import Lesson from '@/app/lesson/[topicId]';
import Onboarding from '@/app/onboarding';
import Children from '@/app/parent/children';
import Content from '@/app/parent/content';
import Health from '@/app/parent/health';
import Profiles from '@/app/profiles';
import SubjectPath from '@/app/subject/[standardId]/[subjectId]';
import TopicScreen from '@/app/topic/[topicId]';
import { TabBar } from '@/components/gamify/TabBar';
import * as Toaster from '@/components/gamify/Toaster';
import { toSlides } from '@/components/lesson/LessonBlocks';
import { useContent } from '@/features/content/registry';
import { useParentSession } from '@/features/profile/parentSession';
import { REWARDS } from '@/features/gamify/xp';
import { verifyParentPin } from '@/lib/secure';
import { telemetry } from '@/lib/telemetry';
import { useApp } from '@/store/app';
import { authoredQuiz, index, patchProgress, playQuiz, progressOf, resetStores, setNow, setupChild } from '../helpers';

const s = () => useApp.getState();
const params = (p: Record<string, string>) => ((globalThis as { __routeParams?: object }).__routeParams = p);
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const later = (ms: number) => act(async () => jest.advanceTimersByTime(ms));

let toast: jest.SpyInstance;
beforeEach(() => {
  setNow('2026-03-02T16:00:00');
  resetStores();
  jest.clearAllMocks();
  toast = jest.spyOn(Toaster, 'toast').mockImplementation(() => undefined);
});
afterEach(() => {
  toast.mockRestore();
  useParentSession.getState().lock();
  jest.useRealTimers();
});

describe('onboarding', () => {
  it('sets up the family, a confirmed PIN and the first learner, then goes home', async () => {
    await render(<Onboarding />);
    await fireEvent.press(screen.getByTestId('start'));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("Parent's name"), '  Faizal ');
    await tap('Continue');
    for (const d of '2580') await tap(d);
    await later(200);
    expect(screen.getByText('Type the PIN one more time.')).toBeOnTheScreen();
    for (const d of '2581') await tap(d);
    expect(screen.getByText('PINs don’t match. Try again.')).toBeOnTheScreen();
    await later(600);
    for (const d of '2580') await tap(d);
    await later(200);
    await fireEvent.changeText(screen.getByLabelText("Child's name"), 'Adam');
    await tap(/^Standard 4/);
    await tap('Continue');
    await tap('Tudung');
    await fireEvent.press(screen.getByTestId('finish-onboarding'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
    expect(s().parent?.name).toBe('Faizal');
    expect(s().profiles).toHaveLength(1);
    expect(s().profiles[0]).toMatchObject({ name: 'Adam', level: 4, avatar: expect.objectContaining({ hair: 'tudung' }) });
    expect(s().activeProfileId).toBe(s().profiles[0].id);
    expect(await verifyParentPin('2580')).toBe(true);
  });

  it('adding a second learner skips the parent steps and keeps the PIN', async () => {
    setupChild({ name: 'Adam' });
    await render(<Onboarding />);
    expect(screen.getByText('Now tell me about our learner!')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Child's name"), 'Aisyah');
    await tap(/^Standard 1/);
    await tap('Continue');
    await fireEvent.press(screen.getByTestId('finish-onboarding'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
    expect(s().profiles.map((p) => [p.name, p.level])).toEqual([
      ['Adam', 3],
      ['Aisyah', 1],
    ]);
    expect(s().parent?.name).toBe('Parent');
  });

  it('“Start over” clears a half-typed PIN', async () => {
    await render(<Onboarding />);
    await fireEvent.press(screen.getByTestId('start'));
    await fireEvent.changeText(screen.getByLabelText("Parent's name"), 'Mum');
    await tap('Continue');
    for (const d of '1111') await tap(d);
    await later(200);
    await tap('Start over');
    expect(screen.getByText('Create a 4-digit parent PIN. It protects the Parent Zone.')).toBeOnTheScreen();
  });
});

describe('lesson player', () => {
  const TOPIC = 's3-math-fractions';
  const slides = () => toSlides(index().topic(TOPIC)!.topic.lesson).length;

  it('pages through the cards, pays the first read, then offers the quiz', async () => {
    setupChild();
    params({ topicId: TOPIC });
    await render(<Lesson />);
    const n = slides();
    expect(screen.getByText(`1/${n}`)).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('lesson-next'));
    expect(screen.getByText(`2/${n}`)).toBeOnTheScreen();
    await tap('Back');
    expect(screen.getByText(`1/${n}`)).toBeOnTheScreen();
    for (let i = 1; i < n; i++) await fireEvent.press(screen.getByTestId('lesson-next'));
    expect(screen.getByTestId('lesson-next-label')).toHaveTextContent('Finish lesson');
    await fireEvent.press(screen.getByTestId('lesson-next'));
    expect(within(screen.getByTestId('lesson-reward')).getByText(`+${REWARDS.lesson.xp} XP`)).toBeOnTheScreen();
    expect(progressOf().topics[TOPIC].lessonDone).toBe(true);
    await tap('Take the quiz!');
    expect(router.replace).toHaveBeenCalledWith(`/quiz/${index().topic(TOPIC)!.topic.quizzes[0].id}`);
  });

  it('a same-day re-read shows no reward', async () => {
    setupChild();
    s().finishLesson({ topicId: TOPIC, seconds: 10 });
    params({ topicId: TOPIC });
    await render(<Lesson />);
    for (let i = 0; i < slides(); i++) await fireEvent.press(screen.getByTestId('lesson-next'));
    expect(screen.queryByTestId('lesson-reward')).toBeNull();
    expect(screen.getByText(/Lesson complete!/)).toBeOnTheScreen();
  });
});

describe('profiles', () => {
  it('picking a learner makes them active and opens home', async () => {
    setupChild({ name: 'Adam' });
    const aisyah = s().addProfile({ name: 'Aisyah', level: 1 });
    await render(<Profiles />);
    await tap('Aisyah');
    expect(s().activeProfileId).toBe(aisyah);
    expect(router.replace).toHaveBeenCalledWith('/home');
    await tap('Add learner');
    expect(router.push).toHaveBeenCalledWith('/parent?next=add-child');
    await tap('Parent zone 🔒');
    expect(router.push).toHaveBeenCalledWith('/parent');
  });
});

describe('me', () => {
  it('settings toggles are saved and links go to the right places', async () => {
    setupChild();
    await render(<Me />);
    await fireEvent.press(screen.getByRole('switch', { name: 'Sound effects' }));
    await fireEvent.press(screen.getByRole('switch', { name: 'Auto-read questions' }));
    expect(s().settings).toMatchObject({ sound: false, autoRead: true });
    for (const [label, path] of [
      ['Customise my avatar', '/avatar'],
      ['Trophy room', '/trophies'],
      ['Switch learner', '/profiles'],
      ['Parent zone', '/parent'],
    ]) {
      await tap(label);
      expect(router.push).toHaveBeenLastCalledWith(path);
    }
  });

  it('shows level, tier and latest badges', async () => {
    setupChild();
    playQuiz(authoredQuiz().quiz.id);
    await render(<Me />);
    expect(screen.getByText(/Level \d+ (Rookie|Explorer)/)).toBeOnTheScreen();
    expect(screen.getByText('Latest badges')).toBeOnTheScreen();
  });
});

describe('learn', () => {
  it('opens on the child’s standard, searches every standard, and switches standards', async () => {
    setupChild({ level: 3 });
    await render(<Learn />);
    expect(screen.getByRole('button', { name: /^Standard 3/ })).toBeSelected();
    await fireEvent.changeText(screen.getByLabelText('Search topics'), 'fraction');
    expect(screen.getByText(/\d+ results?/)).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('button', { name: /Fraction/i })[0]);
    expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/topic\//));
    await fireEvent.changeText(screen.getByLabelText('Search topics'), 'zzzz-nothing');
    expect(screen.getByText('0 results')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Search topics'), '');
    await tap(/^Standard 1/);
    expect(screen.getByRole('button', { name: /^Standard 1/ })).toBeSelected();
  });
});

describe('subject path and topic', () => {
  it('the path lists topics and opens them', async () => {
    setupChild();
    params({ standardId: 'std3', subjectId: 'science' });
    await render(<SubjectPath />);
    const first = index().subject('std3', 'science')!.topics[0];
    await tap(first.title);
    expect(router.push).toHaveBeenCalledWith(`/topic/${first.id}`);
  });

  it('the topic page opens the lesson and each quiz, and reflects progress', async () => {
    setupChild();
    params({ topicId: 's3-sci-teeth' });
    const view = await render(<TopicScreen />);
    expect(screen.getByText(`${toSlides(index().topic('s3-sci-teeth')!.topic.lesson).length} cards · +${REWARDS.lesson.xp} XP`)).toBeOnTheScreen();
    await tap('Read the lesson');
    expect(router.push).toHaveBeenCalledWith('/lesson/s3-sci-teeth');
    const quiz = index().topic('s3-sci-teeth')!.topic.quizzes[0];
    await tap(quiz.title);
    expect(router.push).toHaveBeenCalledWith(`/quiz/${quiz.id}`);
    await view.unmount();
    s().finishLesson({ topicId: 's3-sci-teeth', seconds: 5 });
    await render(<TopicScreen />);
    expect(screen.getByRole('button', { name: 'Read the lesson again' })).toBeOnTheScreen();
  });

  it('an unknown topic says so', async () => {
    params({ topicId: 'gone' });
    await render(<TopicScreen />);
    expect(screen.getByText('This topic is not available.')).toBeOnTheScreen();
  });
});

describe('avatar screen', () => {
  it('changes basics and takes accessories off', async () => {
    setupChild();
    patchProgress((p) => p.inventory.push('round-specs'));
    s().equip('glasses', 'round-specs');
    await render(<AvatarScreen />);
    await tap('Wink');
    await tap('Golden hair');
    expect(s().profiles[0].avatar).toMatchObject({ eyes: 'wink', hairColor: '#D9A04A', glasses: 'round-specs' });
    await tap('No Glasses');
    expect(s().profiles[0].avatar.glasses).toBeUndefined();
    await tap('Visit the shop 🛍️');
    expect(router.push).toHaveBeenCalledWith('/shop');
  });
});

describe('home', () => {
  it('points to tricky questions, the next topic, and locked arcade games', async () => {
    setupChild();
    const { quiz } = authoredQuiz();
    playQuiz(quiz.id, quiz.questions.map((_, i) => i !== 0));
    await render(<Home />);
    expect(screen.getByText(/I saved 1 tricky question/)).toBeOnTheScreen();
    await tap('Review tricky questions');
    expect(router.push).toHaveBeenCalledWith('/quiz/review');
    await tap(/^Continue /);
    expect(router.push).toHaveBeenLastCalledWith(expect.stringMatching(/^\/topic\//));
    const locked = index().standardByLevel(3)!.arcade.find((g) => g.price > 0)!;
    await tap(locked.title);
    expect(router.push).toHaveBeenLastCalledWith('/shop?tab=games');
    const free = index().standardByLevel(3)!.arcade.find((g) => g.price === 0)!;
    await tap(free.title);
    expect(router.push).toHaveBeenLastCalledWith(`/quiz/${free.quiz.id}`);
  });
});

describe('tab bar', () => {
  const props = (index: number) =>
    ({
      state: { index, routes: ['home', 'learn', 'quests', 'shop', 'me'].map((name) => ({ key: `${name}-k`, name })) },
      navigation: { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() },
    }) as never as Parameters<typeof TabBar>[0];

  it('marks the current tab, navigates to others, and badges claimable quests', async () => {
    setupChild();
    patchProgress((p) => (p.quests.list = p.quests.list.map((q, i) => (i === 0 ? { ...q, progress: q.target } : q))));
    const p = props(0);
    await render(<TabBar {...p} />);
    expect(screen.getByRole('tab', { name: 'Home' })).toBeSelected();
    expect(within(screen.getByRole('tab', { name: 'Quests' })).getByText('1')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Shop' }));
    expect(p.navigation.navigate).toHaveBeenCalledWith('shop');
    await fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
    expect(p.navigation.navigate).toHaveBeenCalledTimes(1);
  });
});

describe('parent tools', () => {
  beforeEach(() => useParentSession.getState().unlock());

  it('children: rename, change standard, reset and remove (after confirming)', async () => {
    const adam = setupChild({ name: 'Adam' });
    s().addProfile({ name: 'Aisyah', level: 1 });
    playQuiz(authoredQuiz().quiz.id);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.find((b) => b.text === 'Yes')?.onPress?.());
    await render(<Children />);
    const name = screen.getByLabelText("Adam's name");
    await fireEvent.changeText(name, '  Adam Z ');
    await fireEvent(name, 'blur');
    expect(s().profiles[0].name).toBe('Adam Z');
    await fireEvent.changeText(screen.getByLabelText("Aisyah's name"), '   ');
    await fireEvent(screen.getByLabelText("Aisyah's name"), 'blur');
    expect(s().profiles[1].name).toBe('Aisyah');
    await fireEvent.press(screen.getAllByRole('button', { name: /^4/ })[0]);
    expect(s().profiles[0].level).toBe(4);
    await fireEvent.press(screen.getAllByRole('button', { name: 'Reset progress' })[0]);
    expect(progressOf(adam).xp).toBe(0);
    await fireEvent.press(screen.getAllByRole('button', { name: 'Remove' })[1]);
    expect(s().profiles.map((p) => p.name)).toEqual(['Adam Z']);
    expect(alert).toHaveBeenCalledTimes(2);
    alert.mockRestore();
  });

  it('children: cancelling the confirmation changes nothing', async () => {
    setupChild({ name: 'Adam' });
    playQuiz(authoredQuiz().quiz.id);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await render(<Children />);
    await tap('Reset progress');
    await tap('Remove');
    expect(progressOf().xp).toBeGreaterThan(0);
    expect(s().profiles).toHaveLength(1);
    alert.mockRestore();
  });

  it('health: groups screen timings, lists errors, and clears', async () => {
    telemetry.clear();
    telemetry.screen('/quiz/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', 100);
    telemetry.screen('/quiz/6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b', 300);
    telemetry.error(new Error('Something broke'));
    await render(<Health />);
    expect(screen.getByText('/quiz/:id')).toBeOnTheScreen();
    expect(screen.getByText(/^200 ms/)).toBeOnTheScreen();
    expect(screen.getByText('(2×)')).toBeOnTheScreen();
    expect(screen.getByText('Something broke')).toBeOnTheScreen();
    await tap('Clear report');
    expect(screen.getByText('No crashes recorded ✅')).toBeOnTheScreen();
  });

  it('content: saves the URL, checks for updates and reports the result', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ schema: 1, standards: [] }) })) as unknown as typeof fetch;
    await render(<Content />);
    await fireEvent.changeText(screen.getByLabelText('Content URL'), 'https://cdn.example.com/c/');
    await tap('Save & check now');
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Syllabus is up to date' })));
    expect(useContent.getState().sourceUrl).toBe('https://cdn.example.com/c');
    await tap('Check for app update (OTA)');
    await waitFor(() => expect(screen.getByText('OTA updates are off in this build (enable with EAS Update).')).toBeOnTheScreen());
  });
});
