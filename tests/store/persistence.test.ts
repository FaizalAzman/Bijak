import { kv } from '@/lib/storage';
import { useApp } from '@/store/app';
import { authoredQuiz, playQuiz, resetStores, setNow, setupChild } from '../helpers';

/** Simulate an app restart: memory is wiped, then the store rehydrates from the device. */
async function coldStart(saved = kv.getItem('bijak-app')!) {
  useApp.setState(useApp.getInitialState(), true); // (this also writes the empty state…)
  expect(useApp.getState().profiles).toEqual([]);
  kv.setItem('bijak-app', saved); // …so put the real save back, as it would be on disk
  await useApp.persist.rehydrate();
}

beforeEach(() => {
  setNow('2026-03-02T09:00:00');
  resetStores();
});
afterEach(() => jest.useRealTimers());

it('persists only durable state to the device', () => {
  setupChild();
  playQuiz(authoredQuiz().quiz.id);
  const saved = JSON.parse(kv.getItem('bijak-app')!);
  expect(saved.version).toBe(1);
  expect(Object.keys(saved.state).sort()).toEqual(['activeProfileId', 'dirtyAt', 'parent', 'profiles', 'progress', 'settings', 'syncedAt', 'syncedRevision']);
});

it('a restarted app picks up exactly where the child left off', async () => {
  const id = setupChild();
  playQuiz(authoredQuiz().quiz.id);
  const before = useApp.getState();
  await coldStart();
  const after = useApp.getState();
  expect(after.activeProfileId).toBe(id);
  expect(after.progress).toEqual(before.progress);
  expect(after.profiles).toEqual(before.profiles);
  expect(typeof after.finishQuiz).toBe('function');
});

it('older saves without new optional fields still work', async () => {
  const id = setupChild();
  const raw = JSON.parse(kv.getItem('bijak-app')!);
  delete raw.state.syncedRevision;
  delete raw.state.settings.restDays;
  delete raw.state.progress[id].quizBonusDay;
  await coldStart(JSON.stringify(raw));
  expect(useApp.getState().syncedRevision).toBeNull();
  expect(useApp.getState().settings.restDays).toEqual([]);
  expect(useApp.getState().settings.sound).toBe(true);
  expect(() => playQuiz(authoredQuiz().quiz.id)).not.toThrow();
  expect(useApp.getState().progress[id].quizBonusDay).toBeDefined();
});

it('markSynced records the backup and never moves the synced revision backwards', () => {
  setupChild();
  const s = useApp.getState();
  s.markSynced(1_000, 50);
  expect(useApp.getState()).toMatchObject({ syncedAt: 1_000, syncedRevision: 50 });
  // A slow, older upload finishing late must not make newer data look synced… or unsynced.
  useApp.getState().markSynced(2_000, 40);
  expect(useApp.getState()).toMatchObject({ syncedAt: 2_000, syncedRevision: 50 });
});
