/**
 * A syllabus update delivered over the air (no app store release): the parent points the
 * app at a content URL, Standard 7 arrives, and a child can learn, play and earn with it.
 */
import { getContentIndex, useContent } from '@/features/content/registry';
import { allBadges } from '@/features/gamify/badges';
import { useApp } from '@/store/app';
import manifest from '../../content/manifest.json';
import { advanceDays, patchProgress, playQuiz, progressOf, resetStores, setNow, setupChild } from '../helpers';
import { checkInvariants } from './invariants';

const BASE = 'https://cdn.example.com/bijak';
const std7 = {
  id: 'std7',
  level: 7,
  title: 'Standard 7',
  version: 1,
  subjects: [
    {
      id: 'math',
      name: 'Mathematics',
      emoji: '🔢',
      topics: [
        {
          id: 's7-algebra',
          title: 'Algebra',
          lesson: [{ type: 'text', text: 'Letters can stand for numbers.' }],
          quizzes: [
            { id: 's7-algebra-q1', title: 'Find x', questions: [1, 2, 3].map((n) => ({ id: `q${n}`, type: 'numpad', prompt: `x + ${n} = ${n + 5}. x = ?`, answer: '5' })) },
            { id: 's7-algebra-q2', title: 'Sums', generator: { kind: 'addition', max: 500 } },
          ],
        },
      ],
    },
  ],
  arcade: [{ id: 's7-dash', title: 'Algebra Dash', emoji: '⚡', price: 80, subjectId: 'math', quiz: { id: 's7-dash-q', title: 'Dash', mode: 'timeAttack', generator: { kind: 'addition', max: 200 } } }],
};

beforeEach(() => {
  setNow('2026-06-01T10:00:00');
  resetStores();
  global.fetch = jest.fn(async (url: string) => {
    if (url === `${BASE}/manifest.json`) return { ok: true, status: 200, json: async () => ({ schema: 1, standards: [...manifest.standards, { id: 'std7', level: 7, version: 1, file: 'standards/std7.json' }] }) };
    if (url === `${BASE}/standards/std7.json`) return { ok: true, status: 200, json: async () => std7 };
    return { ok: false, status: 404, json: async () => ({}) };
  }) as unknown as typeof fetch;
});
afterEach(() => jest.useRealTimers());

it('a new standard arrives and works end to end for a child', async () => {
  const id = setupChild({ level: 6 });
  useContent.getState().setSourceUrl(BASE);
  expect(await useContent.getState().checkForUpdates()).toEqual({ updated: ['std7'] });

  // The parent moves the child up; tomorrow's quests come from Standard 7.
  useApp.getState().updateProfile(id, { level: 7 });
  advanceDays(1);
  useApp.getState().ensureToday();
  for (const q of progressOf().quests.list) if (q.subjectId) expect(q.subjectId).toBe('math');

  // Learn and play it.
  expect(useApp.getState().finishLesson({ topicId: 's7-algebra', seconds: 90 })?.xp).toBeGreaterThan(0);
  const r = playQuiz('s7-algebra-q1');
  expect(r.reward.xp).toBeGreaterThan(0);
  expect(progressOf().attempts[0]).toMatchObject({ standardId: 'std7', topicId: 's7-algebra' });

  // The new paid arcade game is priced by the downloaded syllabus.
  patchProgress({ coins: 100 });
  expect(useApp.getState().unlockArcade('s7-dash')).toBe(true);
  expect(progressOf().coins).toBe(20);

  // Mastering every Standard 7 maths quiz earns the new mastery badge.
  expect(allBadges(getContentIndex()).some((b) => b.id === 'master-std7-math')).toBe(true);
  playQuiz('s7-algebra-q2');
  expect(progressOf().badges['master-std7-math']).toBeDefined();
  checkInvariants('after std7', { settled: true });
});

it('the downloaded syllabus survives a restart (cached on the device)', async () => {
  useContent.getState().setSourceUrl(BASE);
  await useContent.getState().checkForUpdates();
  const saved = require('@/lib/storage').kv.getItem('bijak-content');
  useContent.setState(useContent.getInitialState(), true);
  require('@/lib/storage').kv.setItem('bijak-content', saved);
  await useContent.persist.rehydrate();
  expect(getContentIndex().standardByLevel(7)?.title).toBe('Standard 7');
});
