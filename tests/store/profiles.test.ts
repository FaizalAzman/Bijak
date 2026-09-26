import { DEFAULT_AVATAR, FREE_ITEMS } from '@/features/gamify/shop';
import { dayKey } from '@/lib/date';
import { emptyProgress, useApp } from '@/store/app';
import { authoredQuiz, playQuiz, progressOf, resetStores, setNow, setupChild } from '../helpers';

beforeEach(() => {
  setNow('2026-03-02T09:00:00');
  resetStores();
});
afterEach(() => jest.useRealTimers());

const s = () => useApp.getState();

describe('family setup', () => {
  it('trims the parent name and creates a family id', () => {
    s().setupFamily('  Mak Cik Aminah  ');
    expect(s().parent).toMatchObject({ name: 'Mak Cik Aminah', familyId: expect.stringMatching(/^[0-9a-f-]{36}$/) });
  });

  it('refuses an empty parent name', () => {
    expect(() => s().setupFamily('   ')).toThrow('Name is required');
    expect(s().parent).toBeNull();
  });
});

describe('addProfile', () => {
  it('creates a learner with starting coins and the free outfit/background', () => {
    const id = s().addProfile({ name: ' Adam ', level: 3 });
    const profile = s().profiles.find((p) => p.id === id)!;
    expect(profile).toMatchObject({ name: 'Adam', level: 3, avatar: DEFAULT_AVATAR });
    expect(s().progress[id]).toEqual(emptyProgress());
    expect(s().progress[id].coins).toBe(50);
    expect(s().progress[id].inventory).toEqual(FREE_ITEMS);
  });

  it('copies the avatar so later edits to the caller object do not leak in', () => {
    const avatar = { ...DEFAULT_AVATAR };
    const id = s().addProfile({ name: 'Aisyah', level: 1, avatar });
    avatar.skin = '#000000';
    expect(s().profiles.find((p) => p.id === id)!.avatar.skin).toBe(DEFAULT_AVATAR.skin);
  });

  it('limits names to 30 characters', () => {
    const id = s().addProfile({ name: 'A'.repeat(50), level: 2 });
    expect(s().profiles.find((p) => p.id === id)!.name).toHaveLength(30);
  });

  it.each([
    ['empty name', { name: '  ', level: 3 }],
    ['level 0', { name: 'A', level: 0 }],
    ['fractional level', { name: 'A', level: 2.5 }],
    ['level 13', { name: 'A', level: 13 }],
    ['NaN level', { name: 'A', level: Number.NaN }],
  ])('rejects %s without changing anything', (_, input) => {
    expect(() => s().addProfile(input)).toThrow();
    expect(s().profiles).toEqual([]);
    expect(s().progress).toEqual({});
  });

  it('gives every learner a unique id', () => {
    const ids = new Set(Array.from({ length: 20 }, (_, i) => s().addProfile({ name: `Kid ${i}`, level: 1 })));
    expect(ids.size).toBe(20);
  });
});

describe('updateProfile / removeProfile / selectProfile / resetProgress', () => {
  it('renames and changes standard with validation', () => {
    const id = s().addProfile({ name: 'Adam', level: 3 });
    s().updateProfile(id, { name: '  Adam Z ', level: 4 });
    expect(s().profiles[0]).toMatchObject({ name: 'Adam Z', level: 4 });
    expect(() => s().updateProfile(id, { name: '' })).toThrow();
    expect(() => s().updateProfile(id, { level: 99 })).toThrow();
    expect(s().profiles[0]).toMatchObject({ name: 'Adam Z', level: 4 });
  });

  it('ignores updates for unknown learners', () => {
    s().addProfile({ name: 'Adam', level: 3 });
    const before = s().dirtyAt;
    s().updateProfile('ghost', { name: 'Ghost' });
    expect(s().dirtyAt).toBe(before);
    expect(s().profiles.map((p) => p.name)).toEqual(['Adam']);
  });

  it('removing the active learner deletes their progress and signs them out', () => {
    const a = s().addProfile({ name: 'Adam', level: 3 });
    const b = s().addProfile({ name: 'Aisyah', level: 1 });
    s().selectProfile(a);
    s().removeProfile(a);
    expect(s().activeProfileId).toBeNull();
    expect(s().progress[a]).toBeUndefined();
    expect(s().profiles.map((p) => p.id)).toEqual([b]);
  });

  it('removing another learner keeps the active one', () => {
    const a = s().addProfile({ name: 'Adam', level: 3 });
    const b = s().addProfile({ name: 'Aisyah', level: 1 });
    s().selectProfile(a);
    s().removeProfile(b);
    expect(s().activeProfileId).toBe(a);
  });

  it('selecting a learner prepares today’s quests; unknown ids are ignored', () => {
    const a = s().addProfile({ name: 'Adam', level: 3 });
    s().selectProfile('ghost');
    expect(s().activeProfileId).toBeNull();
    s().selectProfile(a);
    expect(s().activeProfileId).toBe(a);
    expect(progressOf(a).quests.day).toBe(dayKey());
    expect(progressOf(a).quests.list).toHaveLength(3);
    s().selectProfile(null);
    expect(s().activeProfileId).toBeNull();
  });

  it('resetProgress also takes off bought items (they are no longer owned) but keeps the look', () => {
    const id = setupChild();
    s().setAvatar({ hair: 'tudung', eyes: 'wink' });
    s().buy('tee-sky');
    s().equip('outfit', 'tee-sky');
    useApp.setState((st) => ({ progress: { ...st.progress, [id]: { ...st.progress[id], coins: 500, inventory: [...st.progress[id].inventory, 'cap-red'] } } }));
    s().equip('hat', 'cap-red');
    s().resetProgress(id);
    const avatar = s().profiles[0].avatar;
    expect(avatar).toMatchObject({ outfit: DEFAULT_AVATAR.outfit, bg: DEFAULT_AVATAR.bg, hair: 'tudung', eyes: 'wink' });
    expect(avatar.hat).toBeUndefined();
  });

  it('resetProgress starts a learner over; unknown ids do not create ghosts', () => {
    const id = setupChild();
    playQuiz(authoredQuiz().quiz.id);
    expect(progressOf(id).xp).toBeGreaterThan(0);
    s().resetProgress(id);
    expect(progressOf(id)).toEqual(emptyProgress());
    s().resetProgress('ghost');
    expect(s().progress.ghost).toBeUndefined();
  });

  it('settings merge', () => {
    s().updateSettings({ sound: false });
    s().updateSettings({ autoRead: true });
    expect(s().settings).toMatchObject({ sound: false, haptics: true, voice: true, autoRead: true, restDays: [] });
  });

  it('reminder choices merge into the saved ones and are cleaned before saving', () => {
    expect(s().settings.reminders).toEqual({ daily: false, time: '17:00', streak: false, weekly: false });
    s().updateSettings({ reminders: { daily: true, time: '18:00' } });
    s().updateSettings({ reminders: { weekly: true } });
    expect(s().settings.reminders).toEqual({ daily: true, time: '18:00', streak: false, weekly: true });
    s().updateSettings({ reminders: { time: '25:61', streak: 'yes' as never } });
    expect(s().settings.reminders).toEqual({ daily: true, time: '18:00', streak: false, weekly: true });
    // Other settings changes never touch reminders.
    s().updateSettings({ sound: false, reminders: undefined });
    expect(s().settings.reminders).toEqual({ daily: true, time: '18:00', streak: false, weekly: true });
  });

  it('the app language is English or Bahasa Melayu, never anything else', () => {
    expect(s().settings.uiLang).toBe('en');
    s().updateSettings({ uiLang: 'ms' });
    expect(s().settings.uiLang).toBe('ms');
    s().updateSettings({ uiLang: 'fr' as never });
    s().updateSettings({ uiLang: undefined as never, sound: false });
    expect(s().settings).toMatchObject({ uiLang: 'ms', sound: false });
  });

  it('rest days from the parent are cleaned before saving', () => {
    s().updateSettings({ restDays: [6, 0, 6, 12, 3] });
    expect(s().settings.restDays).toEqual([6, 0]);
  });
});

describe('siblings are isolated', () => {
  it('one child’s play never touches the other’s progress', () => {
    const a = setupChild({ name: 'Adam' });
    const b = s().addProfile({ name: 'Aisyah', level: 3 });
    const before = structuredClone(s().progress[b]);
    playQuiz(authoredQuiz().quiz.id);
    s().buy('tee-sky');
    expect(s().progress[b]).toEqual(before);
    expect(progressOf(a).xp).toBeGreaterThan(0);
    s().selectProfile(b);
    expect(progressOf(b).coins).toBe(50);
  });

  it('actions without an active learner are refused safely', () => {
    s().addProfile({ name: 'Adam', level: 3 });
    const before = structuredClone(s().progress);
    const { quiz } = authoredQuiz();
    expect(s().answer({ ctx: { key: 'k', quizId: quiz.id, standardId: 'std3', subjectId: 'math', q: quiz.questions[0] }, correct: true, combo: 1, difficulty: 1, review: false })).toBe(0);
    expect(s().finishQuiz({ quizId: quiz.id, standardId: 'std3', subjectId: 'math', title: 'x', mode: 'practice', correct: 5, total: 5, seconds: 10 }).xp).toBe(0);
    expect(s().finishLesson({ topicId: 't', seconds: 5 })).toBeNull();
    expect(s().claimQuest('x')).toBe(0);
    expect(s().buy('tee-sky')).toBe(false);
    expect(s().unlockArcade('x')).toBe(false);
    expect(s().equip('hat', undefined)).toBe(false);
    expect(s().setAvatar({ eyes: 'wink' })).toBe(false);
    expect(s().progress).toEqual(before);
  });
});
