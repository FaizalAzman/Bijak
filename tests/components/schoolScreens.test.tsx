/**
 * Matching the school, on screen: parents set each child's Maths & Science language and
 * the topics the class is on; the child then sees those topics first, in that language.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import Home from '@/app/(tabs)/home';
import Children from '@/app/parent/children';
import Dashboard from '@/app/parent/dashboard';
import SchoolTopics from '@/app/parent/school';
import QuizScreen from '@/app/quiz/[quizId]';
import TopicScreen from '@/app/topic/[topicId]';
import * as Toaster from '@/components/gamify/Toaster';
import { getContentIndex } from '@/features/content/registry';
import { useParentSession } from '@/features/profile/parentSession';
import { useApp } from '@/store/app';
import { playQuiz, progressOf, resetStores, setNow, setupChild } from '../helpers';
import { answerThroughUi } from '../solve';

const s = () => useApp.getState();
const params = (p: Record<string, string>) => ((globalThis as { __routeParams?: object }).__routeParams = p);
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const profile = (id: string) => s().profiles.find((p) => p.id === id)!;

let toast: jest.SpyInstance;
beforeEach(() => {
  setNow('2026-03-02T16:00:00');
  resetStores();
  jest.clearAllMocks();
  params({});
  toast = jest.spyOn(Toaster, 'toast').mockImplementation(() => undefined);
});
afterEach(() => {
  toast.mockRestore();
  useParentSession.getState().lock();
  jest.useRealTimers();
});

describe('parent: at school now', () => {
  beforeEach(() => useParentSession.getState().unlock());

  it('lists the child’s subjects; tapping a topic pins it and “Not sure” clears it', async () => {
    const id = setupChild({ name: 'Adam' });
    params({ child: id });
    await render(<SchoolTopics />);
    expect(screen.getByText(/Which topic is Adam’s class on in Standard 3\?/)).toBeOnTheScreen();
    for (const name of ['🔢 Mathematics', '🔬 Science', '🔤 English', '📖 Bahasa Melayu']) expect(screen.getByText(name)).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Not sure' })).toHaveLength(4);
    await tap(/Fractions, Decimals & Percent/);
    expect(profile(id).schoolTopics).toEqual({ math: 's3-math-fractions' });
    expect(screen.getByRole('button', { name: /Fractions, Decimals & Percent/ })).toBeSelected();
    expect(screen.getAllByRole('button', { name: 'Not sure' })[0]).not.toBeSelected();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Not sure' })[0]);
    expect(profile(id).schoolTopics).toEqual({});
  });

  it('shows the topics in the child’s teaching language', async () => {
    const id = setupChild({ name: 'Aina' });
    s().updateProfile(id, { medium: 'ms' });
    params({ child: id });
    await render(<SchoolTopics />);
    expect(screen.getByText('🔢 Matematik')).toBeOnTheScreen();
    expect(screen.getByText('🔬 Sains')).toBeOnTheScreen();
    await tap(/Manusia: Gigi/);
    expect(profile(id).schoolTopics).toEqual({ science: 's3-sci-teeth' });
  });

  it('picks the right child, falling back to the first one', async () => {
    const adam = setupChild({ name: 'Adam' });
    const aina = s().addProfile({ name: 'Aina', level: 1 });
    params({ child: aina });
    const view = await render(<SchoolTopics />);
    expect(screen.getByText(/Aina’s class on in Standard 1/)).toBeOnTheScreen();
    await tap(/Numbers up to 100$/);
    expect(profile(aina).schoolTopics).toEqual({ math: 's1-math-numbers' });
    expect(profile(adam).schoolTopics).toBeUndefined();
    await view.unmount();
    params({ child: 'ghost' });
    await render(<SchoolTopics />);
    expect(screen.getByText(/Adam’s class on in Standard 3/)).toBeOnTheScreen();
  });

  it('says so when there is no learner yet', async () => {
    s().setupFamily('Parent');
    await render(<SchoolTopics />);
    expect(screen.getByText('No learner to set up yet.')).toBeOnTheScreen();
  });

  it('stays behind the parent PIN', async () => {
    useParentSession.getState().lock();
    setupChild();
    await render(<SchoolTopics />);
    expect(router.replace).toHaveBeenCalledWith('/parent');
    expect(screen.queryByText('Not sure')).toBeNull();
  });

  it('children: choose the teaching language and see this week’s topics', async () => {
    const id = setupChild({ name: 'Adam' });
    await render(<Children />);
    expect(screen.getByRole('button', { name: 'English (DLP)' })).toBeSelected();
    expect(screen.getByTestId(`school-${id}`)).toHaveTextContent('Not set yet — tell Bijak which topics the class is on.');
    await tap('Set school topics');
    expect(router.push).toHaveBeenCalledWith(`/parent/school?child=${id}`);

    await act(async () => {
      s().setSchoolTopic(id, 'math', 's3-math-fractions');
      s().setSchoolTopic(id, 'science', 's3-sci-teeth');
    });
    await tap('Bahasa Melayu');
    expect(profile(id).medium).toBe('ms');
    expect(screen.getByRole('button', { name: 'Bahasa Melayu' })).toBeSelected();
    expect(screen.getByTestId(`school-${id}`)).toHaveTextContent('Matematik: Pecahan, Perpuluhan dan Peratus · Sains: Manusia: Gigi');
    await tap('English (DLP)');
    expect(screen.getByTestId(`school-${id}`)).toHaveTextContent('Mathematics: Fractions, Decimals & Percent · Science: Humans: Our Teeth');
  });

  it('dashboard links to the selected child’s school topics', async () => {
    const id = setupChild({ name: 'Adam' });
    await render(<Dashboard />);
    await tap('At school now');
    expect(router.push).toHaveBeenCalledWith(`/parent/school?child=${id}`);
  });
});

describe('child: school topics come first', () => {
  it('“Continue learning” leads with the school topic; other school topics are listed', async () => {
    const id = setupChild();
    s().setSchoolTopic(id, 'math', 's3-math-money');
    s().setSchoolTopic(id, 'science', 's3-sci-plants');
    await render(<Home />);
    const cont = screen.getByRole('button', { name: 'Continue Money up to RM1000' });
    expect(within(cont).getByText('🏫 At school this week · Mathematics')).toBeOnTheScreen();
    expect(screen.getByText('Also at school this week')).toBeOnTheScreen();
    await tap('At school: Plants');
    expect(router.push).toHaveBeenCalledWith('/topic/s3-sci-plants');
  });

  it('once the school topic is mastered, it stays listed but no longer leads', async () => {
    const id = setupChild();
    s().setSchoolTopic(id, 'math', 's3-math-fractions');
    playQuiz('s3-math-fractions-q1');
    await render(<Home />);
    expect(screen.getByText('At school this week')).toBeOnTheScreen();
    expect(within(screen.getByRole('button', { name: 'At school: Fractions, Decimals & Percent' })).getByText(/Mastered ✓/)).toBeOnTheScreen();
    expect(screen.queryByText(/🏫 At school this week ·/)).toBeNull();
  });

  it('a Bahasa Melayu child sees Maths & Science in Bahasa Melayu', async () => {
    const id = setupChild();
    s().updateProfile(id, { medium: 'ms' });
    s().setSchoolTopic(id, 'math', 's3-math-fractions');
    await render(<Home />);
    const cont = screen.getByRole('button', { name: 'Continue Pecahan, Perpuluhan dan Peratus' });
    expect(within(cont).getByText('🏫 At school this week · Matematik')).toBeOnTheScreen();
  });

  it('the topic page tags the school topic', async () => {
    const id = setupChild();
    s().setSchoolTopic(id, 'science', 's3-sci-teeth');
    params({ topicId: 's3-sci-teeth' });
    const view = await render(<TopicScreen />);
    expect(screen.getByText('🏫 At school this week')).toBeOnTheScreen();
    await view.unmount();
    params({ topicId: 's3-sci-plants' });
    await render(<TopicScreen />);
    expect(screen.queryByText('🏫 At school this week')).toBeNull();
  });

  it('the topic page is in the child’s teaching language', async () => {
    const id = setupChild();
    s().updateProfile(id, { medium: 'ms' });
    params({ topicId: 's3-sci-teeth' });
    await render(<TopicScreen />);
    expect(screen.getAllByText('Manusia: Gigi').length).toBeGreaterThan(0);
    expect(screen.getByText('Ujian gigi sihat')).toBeOnTheScreen();
  });

  it('a Bahasa Melayu quiz uses BM words and buttons, and counts for the same topic', async () => {
    const id = setupChild();
    s().updateProfile(id, { medium: 'ms' });
    params({ quizId: 's3-sci-rules-q1', fixed: '1' });
    await render(<QuizScreen />);
    const questions = getContentIndex('ms').quiz('s3-sci-rules-q1')!.quiz.questions;
    expect(screen.getByText(questions[0].prompt)).toBeOnTheScreen();
    for (const q of questions) {
      await answerThroughUi(q, true);
      await fireEvent.press(screen.getByTestId('continue'));
    }
    expect(screen.getByText('Perfect score!')).toBeOnTheScreen();
    expect(progressOf(id).topics['s3-sci-rules'].best['s3-sci-rules-q1']).toBe(100);
  });
});
