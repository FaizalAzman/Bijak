/**
 * Module 2 + 4 — Local-first app state (Zustand persisted to on-device SQLite).
 * Holds the parent account, child profiles and each child's learning progress.
 * Every mutation bumps `dirtyAt` (strictly increasing) so the cloud sync service knows what
 * to upload; `syncedRevision` is the `dirtyAt` of the last snapshot that reached the cloud.
 *
 * Business rules enforced here (the UI is never trusted to enforce them):
 * - Coins can never go negative; prices and level locks come from the catalogue/content.
 * - Only owned items can be equipped; outfit and background can't be removed.
 * - Quiz completion and perfect bonuses need ≥ `REWARDS.minBonusQuestions` questions and each
 *   pays once per quiz per day (a retry that turns perfect still earns the perfect bonus);
 *   lesson re-reads earn XP once per topic per day.
 * - Streaks count days with a finished quiz or lesson; parent-set rest days never break them and
 *   rest-day shields cover a missed school day (see features/gamify/streak.ts). Quests roll over
 *   at local midnight.
 */
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getContentIndex } from '@/features/content/registry';
import { Lang } from '@/features/content/schema';
import { newlyEarned, type BadgeDef } from '@/features/gamify/badges';
import { applyQuestEvent, generateDailyQuests, type Quest, type QuestEvent } from '@/features/gamify/quests';
import { advanceStreak, cleanRestDays, liveStreak as streakShown, SHIELD } from '@/features/gamify/streak';
import { DEFAULT_AVATAR, EYES, FREE_ITEMS, HAIR_COLORS, HAIR_STYLES, itemById, SKIN_TONES, type AvatarConfig, type Slot } from '@/features/gamify/shop';
import { levelFromXp, REWARDS, xpForAnswer } from '@/features/gamify/xp';
import { topicStatus } from '@/features/progress/selectors';
import { cleanReminders, DEFAULT_REMINDERS } from '@/features/reminders/plan';
import { dueCards, srsUpdate, type SrsContext } from '@/features/srs/srs';
import { dayKey } from '@/lib/date';
import { kv } from '@/lib/storage';
import { cleanVoiceChoices } from '@/lib/voice';
import type { Attempt, Parent, Profile, Progress, Settings, SettingsPatch, TopicStat } from './types';

export function emptyProgress(): Progress {
  return {
    xp: 0,
    coins: 50,
    streak: { current: 0, best: 0, lastDay: null },
    quests: { day: '', list: [] },
    inventory: [...FREE_ITEMS],
    badges: {},
    srs: {},
    topics: {},
    days: {},
    attempts: [],
    totals: { answered: 0, correct: 0, quizzes: 0, perfect: 0, lessons: 0, reviews: 0, bestCombo: 0, purchases: 0 },
    timeAttackBest: {},
    quizBonusDay: {},
  };
}

export interface AnswerInput {
  ctx: SrsContext;
  correct: boolean;
  combo: number;
  difficulty: number;
  review: boolean;
  /** Time-attack answer (smaller per-answer XP). */
  fast?: boolean;
}

export interface FinishInput {
  quizId: string;
  topicId?: string;
  standardId: string;
  subjectId: string;
  title: string;
  mode: Attempt['mode'];
  correct: number;
  total: number;
  seconds: number;
}

export interface FinishReward {
  xp: number;
  coins: number;
  newBest: boolean;
  badges: BadgeDef[];
  questsDone: Quest[];
  streak: number;
  /** A rest-day shield was earned (every `SHIELD.earnEvery` streak days). */
  shieldEarned: boolean;
}

interface AppState {
  parent: Parent | null;
  profiles: Profile[];
  activeProfileId: string | null;
  progress: Record<string, Progress>;
  settings: Settings;
  dirtyAt: number;
  syncedAt: number | null;
  syncedRevision: number | null;

  setupFamily: (parentName: string) => void;
  addProfile: (p: { name: string; level: number; avatar?: AvatarConfig; medium?: Profile['medium'] }) => string;
  /** Changing the standard clears the "at school now" topics (they belong to the old year). */
  updateProfile: (id: string, patch: Partial<Pick<Profile, 'name' | 'level' | 'avatar' | 'medium'>>) => void;
  /** Pin the topic the child's class is on at school (null clears it). Returns false if it isn't in their standard. */
  setSchoolTopic: (profileId: string, subjectId: string, topicId: string | null) => boolean;
  removeProfile: (id: string) => void;
  selectProfile: (id: string | null) => void;
  updateSettings: (patch: SettingsPatch) => void;
  resetProgress: (id: string) => void;
  /** Record a finished backup of the snapshot taken at revision `revision` (its `dirtyAt`). */
  markSynced: (at: number, revision: number) => void;

  ensureToday: () => void;
  answer: (a: AnswerInput) => number;
  finishQuiz: (f: FinishInput) => FinishReward;
  /** Returns null for a topic that isn't in the syllabus (or without an active child). */
  finishLesson: (i: { topicId: string; seconds: number }) => FinishReward | null;
  claimQuest: (questId: string) => number;
  /** Buy a rest-day shield for `SHIELD.price` coins (at most `SHIELD.max` held). */
  buyShield: () => boolean;
  buy: (itemId: string) => boolean;
  unlockArcade: (gameId: string) => boolean;
  equip: (slot: Slot, itemId: string | undefined) => boolean;
  setAvatar: (patch: Partial<Pick<AvatarConfig, 'skin' | 'hair' | 'hairColor' | 'eyes'>>) => boolean;
}

/** Quiz id used for spaced-repetition review sessions (they mix questions from many quizzes). */
export const REVIEW_QUIZ_ID = 'review';

const NO_REWARD: FinishReward = { xp: 0, coins: 0, newBest: false, badges: [], questsDone: [], streak: 0, shieldEarned: false };

export const DEFAULT_SETTINGS: Settings = { sound: true, haptics: true, voice: true, autoRead: false, restDays: [], voices: {}, reminders: DEFAULT_REMINDERS };
const OPTIONAL_SLOTS: Slot[] = ['hat', 'glasses', 'pet'];
const MAX_NAME = 30;
export const MAX_ATTEMPTS = 200;
export const MAX_DAYS_KEPT = 120;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** A finite, non-negative whole number (bad input counts as 0). */
const whole = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
/** Time spent in one sitting; capped so a screen left open for hours doesn't skew the parent report. */
export const MAX_SESSION_SECONDS = 60 * 60;
const sessionSeconds = (s: number) => Math.min(MAX_SESSION_SECONDS, whole(s));

function validName(name: string): string {
  const trimmed = name.trim().slice(0, MAX_NAME);
  if (!trimmed) throw new Error('Name is required');
  return trimmed;
}

function validMedium(medium: unknown): Profile['medium'] {
  const parsed = Lang.safeParse(medium);
  if (!parsed.success) throw new Error(`Invalid teaching language: ${String(medium)}`);
  return parsed.data;
}

function validLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > 12) throw new Error(`Invalid standard level: ${level}`);
  return level;
}

/** Count today for the streak (spending shields on missed school days); returns whether a shield was earned. */
function bumpStreak(p: Progress, today: string, restDays: readonly number[]): boolean {
  const { streak, shieldEarned } = advanceStreak(p.streak, today, restDays);
  p.streak = streak;
  return shieldEarned;
}

function dayStat(p: Progress, today: string) {
  p.days[today] ??= { answered: 0, correct: 0, seconds: {} };
  const keys = Object.keys(p.days).sort();
  if (keys.length > MAX_DAYS_KEPT) for (const k of keys.slice(0, keys.length - MAX_DAYS_KEPT)) delete p.days[k];
  return p.days[today];
}

function topicStat(p: Progress, topicId: string): TopicStat {
  p.topics[topicId] ??= { answered: 0, correct: 0, lessonDone: false, best: {}, lastAt: 0 };
  return p.topics[topicId];
}

/** Today's quests for this child (regenerated the first time anything happens on a new day). */
function rollDay(p: Progress, profile: Profile, today: string) {
  if (p.quests.day === today) return;
  const std = getContentIndex(profile.medium).standardByLevel(profile.level);
  const withQuizzes = (std?.subjects ?? []).filter((s) => s.topics.some((t) => t.quizzes.length > 0));
  // The subject quest follows what the class is doing at school, when a parent has said.
  const atSchool = withQuizzes.filter((s) => profile.schoolTopics?.[s.id]);
  const subjects = atSchool.length ? atSchool : withQuizzes;
  p.quests = { day: today, list: generateDailyQuests(profile.id, today, subjects, dueCards(p.srs).length) };
}

/** Stamp the moment a topic is first mastered (for the weekly parent report). */
function markMastered(p: Progress, topicId: string) {
  const ref = getContentIndex().topic(topicId);
  const stat = p.topics[topicId];
  if (ref && stat && !stat.masteredAt && topicStatus(ref.topic, p).mastered) stat.masteredAt = Date.now();
}

function questEvent(p: Progress, e: QuestEvent) {
  p.quests.list = applyQuestEvent(p.quests.list, e).quests;
}

/** Quests completed since the child was last told — including ones finished mid-quiz by answers. */
function announceQuests(p: Progress): Quest[] {
  const done = p.quests.list.filter((q) => q.progress >= q.target && !q.claimed && !q.notified);
  for (const q of done) q.notified = true;
  return done;
}

function awardBadges(p: Progress): BadgeDef[] {
  const earned = newlyEarned(p, getContentIndex());
  for (const b of earned) p.badges[b.id] = Date.now();
  return earned;
}

function findArcadeGame(gameId: string) {
  for (const std of getContentIndex().standards) {
    const game = std.arcade.find((g) => g.id === gameId);
    if (game) return game;
  }
  return undefined;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      /**
       * Apply a mutation to the active child's progress. Nothing is written (and sync is
       * not triggered) when the mutation left the progress unchanged, e.g. a refused purchase.
       */
      const mutate = <R>(fn: (p: Progress, profile: Profile) => R): R | undefined => {
        const { activeProfileId, progress, profiles } = get();
        const profile = profiles.find((x) => x.id === activeProfileId);
        if (!profile) return undefined;
        const before = JSON.stringify(progress[profile.id] ?? emptyProgress());
        const draft = JSON.parse(before) as Progress;
        const result = fn(draft, profile);
        if (JSON.stringify(draft) !== before) set({ progress: { ...get().progress, [profile.id]: draft }, dirtyAt: nextRevision() });
        return result;
      };

      const restDays = () => get().settings.restDays ?? [];

      /** Strictly increasing, so two changes in the same millisecond still look different to sync. */
      const nextRevision = () => Math.max(Date.now(), get().dirtyAt + 1);

      const activeProfile = () => {
        const { activeProfileId, profiles } = get();
        return profiles.find((p) => p.id === activeProfileId);
      };

      return {
        parent: null,
        profiles: [],
        activeProfileId: null,
        progress: {},
        settings: DEFAULT_SETTINGS,
        dirtyAt: 0,
        syncedAt: null,
        syncedRevision: null,

        setupFamily: (name) => set({ parent: { name: validName(name), createdAt: Date.now(), familyId: Crypto.randomUUID() }, dirtyAt: nextRevision() }),

        addProfile: ({ name, level, avatar, medium }) => {
          const id = Crypto.randomUUID();
          const profile: Profile = {
            id,
            name: validName(name),
            level: validLevel(level),
            avatar: clone(avatar ?? DEFAULT_AVATAR),
            createdAt: Date.now(),
            medium: validMedium(medium ?? 'en'),
          };
          set((s) => ({ profiles: [...s.profiles, profile], progress: { ...s.progress, [id]: emptyProgress() }, dirtyAt: nextRevision() }));
          return id;
        },

        updateProfile: (id, patch) => {
          if (!get().profiles.some((p) => p.id === id)) return;
          const clean: Partial<Profile> = { ...patch };
          if (patch.name !== undefined) clean.name = validName(patch.name);
          if (patch.level !== undefined) clean.level = validLevel(patch.level);
          if (patch.medium !== undefined) clean.medium = validMedium(patch.medium);
          set((s) => ({
            profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...clean, ...(clean.level !== undefined && clean.level !== p.level ? { schoolTopics: {} } : {}) } : p)),
            dirtyAt: nextRevision(),
          }));
        },

        setSchoolTopic: (profileId, subjectId, topicId) => {
          const profile = get().profiles.find((p) => p.id === profileId);
          const subject = profile && getContentIndex().standardByLevel(profile.level)?.subjects.find((s) => s.id === subjectId);
          if (!profile || !subject) return false;
          if (topicId !== null && !subject.topics.some((t) => t.id === topicId)) return false;
          const schoolTopics = { ...profile.schoolTopics };
          if (topicId === null) delete schoolTopics[subjectId];
          else schoolTopics[subjectId] = topicId;
          set((s) => ({ profiles: s.profiles.map((p) => (p.id === profileId ? { ...p, schoolTopics } : p)), dirtyAt: nextRevision() }));
          return true;
        },

        removeProfile: (id) =>
          set((s) => {
            const progress = { ...s.progress };
            delete progress[id];
            return {
              profiles: s.profiles.filter((p) => p.id !== id),
              progress,
              activeProfileId: s.activeProfileId === id ? null : s.activeProfileId,
              dirtyAt: nextRevision(),
            };
          }),

        selectProfile: (id) => {
          if (id && !get().profiles.some((p) => p.id === id)) return;
          set({ activeProfileId: id });
          if (id) get().ensureToday();
        },

        updateSettings: (patch) =>
          set((s) => {
            const settings: Settings = { ...s.settings, ...patch, reminders: s.settings.reminders };
            if (patch.restDays) settings.restDays = cleanRestDays(patch.restDays);
            // Voice choices merge per language; an empty choice goes back to automatic.
            if (patch.voices) settings.voices = cleanVoiceChoices({ ...s.settings.voices, ...patch.voices });
            if (patch.reminders) settings.reminders = cleanReminders({ ...s.settings.reminders, ...patch.reminders }, s.settings.reminders ?? DEFAULT_REMINDERS);
            return { settings };
          }),

        resetProgress: (id) => {
          if (!get().profiles.some((p) => p.id === id)) return;
          // Bought items go with the progress, so take them off too (the look — skin, hair, eyes — stays).
          const unequip = (p: Profile): Profile => {
            const { skin, hair, hairColor, eyes } = p.avatar;
            return { ...p, avatar: { skin, hair, hairColor, eyes, outfit: DEFAULT_AVATAR.outfit, bg: DEFAULT_AVATAR.bg } };
          };
          set((s) => ({
            profiles: s.profiles.map((p) => (p.id === id ? unequip(p) : p)),
            progress: { ...s.progress, [id]: emptyProgress() },
            dirtyAt: nextRevision(),
          }));
        },

        markSynced: (at, revision) => set({ syncedAt: at, syncedRevision: Math.max(revision, get().syncedRevision ?? 0) }),

        ensureToday: () => {
          mutate((p, profile) => rollDay(p, profile, dayKey()));
        },

        answer: ({ ctx, correct, combo, difficulty, review, fast }) =>
          mutate((p, profile) => {
            const today = dayKey();
            rollDay(p, profile, today);
            const d = dayStat(p, today);
            d.answered++;
            p.totals.answered++;
            if (ctx.topicId) {
              const t = topicStat(p, ctx.topicId);
              t.answered++;
              t.lastAt = Date.now();
            }
            const next = srsUpdate(p.srs[ctx.key], ctx, correct);
            if (next === null) delete p.srs[ctx.key];
            else if (next) p.srs[ctx.key] = next;

            const streakNow = Math.max(0, combo);
            questEvent(p, { type: 'answer', correct, combo: streakNow });
            if (review) questEvent(p, { type: 'review', correct });
            if (!correct) return 0;

            d.correct++;
            p.totals.correct++;
            if (review) p.totals.reviews++;
            p.totals.bestCombo = Math.max(p.totals.bestCombo, streakNow);
            if (ctx.topicId) topicStat(p, ctx.topicId).correct++;
            const xp = xpForAnswer(difficulty, streakNow, fast);
            p.xp += xp;
            p.coins += REWARDS.coinPerCorrect;
            questEvent(p, { type: 'xp', amount: xp });
            return xp;
          }) ?? 0,

        finishQuiz: (input) =>
          mutate((p, profile) => {
            // The syllabus, not the caller, says what kind of quiz this was (and where it lives).
            const ref = input.quizId === REVIEW_QUIZ_ID ? undefined : getContentIndex().quiz(input.quizId);
            if (input.quizId !== REVIEW_QUIZ_ID && !ref) return { ...NO_REWARD, streak: liveStreak(p, dayKey(), restDays()) };
            const f: FinishInput = ref
              ? { ...input, mode: ref.quiz.mode, topicId: ref.topic?.id, standardId: ref.standard.id, subjectId: ref.subject.id }
              : { ...input, mode: 'review', topicId: undefined };
            const total = whole(f.total);
            const correct = Math.min(total, whole(f.correct));
            const seconds = sessionSeconds(f.seconds);
            // Nothing answered (e.g. a time-attack left idle): no rewards, no streak.
            if (total === 0) return { ...NO_REWARD, streak: liveStreak(p, dayKey(), restDays()) };
            const today = dayKey();
            rollDay(p, profile, today);
            const timeAttack = f.mode === 'timeAttack';
            const review = f.mode === 'review';
            const perfect = correct === total;
            const bonusEligible = !timeAttack && total >= REWARDS.minBonusQuestions;
            // Only today's entries matter; drop older ones so the record stays small.
            const paid = Object.fromEntries(Object.entries(p.quizBonusDay ?? {}).filter(([, day]) => day === today));
            p.quizBonusDay = paid;
            let xp = 0;
            let coins = 0;
            let newBest = false;

            if (timeAttack) {
              const prev = p.timeAttackBest[f.quizId] ?? 0;
              newBest = correct > prev;
              if (newBest) {
                p.timeAttackBest[f.quizId] = correct;
                xp += REWARDS.newBest.xp;
                coins += REWARDS.newBest.coins;
              }
              xp += correct * REWARDS.timeAttackPerCorrect;
            } else if (bonusEligible) {
              if (!paid[f.quizId]) {
                paid[f.quizId] = today;
                xp += REWARDS.quizComplete.xp;
                coins += REWARDS.quizComplete.coins;
              }
              const perfectKey = `${f.quizId}:perfect`;
              if (perfect && !paid[perfectKey]) {
                paid[perfectKey] = today;
                xp += REWARDS.perfect.xp;
                coins += REWARDS.perfect.coins;
                p.totals.perfect++;
              }
            }
            if (f.topicId && !review) {
              const best = topicStat(p, f.topicId).best;
              best[f.quizId] = Math.max(best[f.quizId] ?? 0, Math.round((correct / total) * 100));
              markMastered(p, f.topicId);
            }
            p.xp += xp;
            p.coins += coins;
            p.totals.quizzes++;
            const shieldEarned = bumpStreak(p, today, restDays());
            const d = dayStat(p, today);
            const key = `${f.standardId}/${f.subjectId}`;
            d.seconds[key] = (d.seconds[key] ?? 0) + seconds;
            p.attempts = [{ ...f, correct, total, seconds, at: Date.now() }, ...p.attempts].slice(0, MAX_ATTEMPTS);

            questEvent(p, { type: 'quizComplete', subjectId: f.subjectId, perfect: perfect && bonusEligible, timeAttack, review });
            if (xp) questEvent(p, { type: 'xp', amount: xp });
            const badges = awardBadges(p);
            return { xp, coins, newBest, badges, questsDone: announceQuests(p), streak: p.streak.current, shieldEarned };
          }) ?? NO_REWARD,

        finishLesson: ({ topicId, seconds }) =>
          mutate((p, profile) => {
            const ref = getContentIndex().topic(topicId);
            if (!ref) return null;
            const standardId = ref.standard.id;
            const subjectId = ref.subject.id;
            const today = dayKey();
            rollDay(p, profile, today);
            const t = topicStat(p, topicId);
            const first = !t.lessonDone;
            const rereadPays = !first && t.lessonXpDay !== today;
            t.lessonDone = true;
            t.lastAt = Date.now();
            markMastered(p, topicId);
            if (first || rereadPays) t.lessonXpDay = today;
            const d = dayStat(p, today);
            const key = `${standardId}/${subjectId}`;
            d.seconds[key] = (d.seconds[key] ?? 0) + sessionSeconds(seconds);
            const shieldEarned = bumpStreak(p, today, restDays());
            const reward = first ? REWARDS.lesson : rereadPays ? REWARDS.lessonReread : { xp: 0, coins: 0 };
            p.xp += reward.xp;
            p.coins += reward.coins;
            if (first) p.totals.lessons++;
            questEvent(p, { type: 'lesson' });
            if (reward.xp) questEvent(p, { type: 'xp', amount: reward.xp });
            return { xp: reward.xp, coins: reward.coins, newBest: false, badges: awardBadges(p), questsDone: announceQuests(p), streak: p.streak.current, shieldEarned };
          }) ?? null,

        claimQuest: (questId) =>
          mutate((p) => {
            const q = p.quests.list.find((x) => x.id === questId);
            if (!q || q.claimed || q.progress < q.target) return 0;
            q.claimed = true;
            p.coins += q.reward;
            return q.reward;
          }) ?? 0,

        buyShield: () =>
          mutate((p) => {
            const held = p.streak.shields ?? 0;
            if (held >= SHIELD.max || p.coins < SHIELD.price) return false;
            p.coins -= SHIELD.price;
            p.streak.shields = held + 1;
            p.totals.purchases++;
            awardBadges(p);
            return true;
          }) ?? false,

        buy: (itemId) =>
          mutate((p) => {
            const item = itemById(itemId);
            if (!item || p.inventory.includes(item.id)) return false;
            if (item.minLevel && levelFromXp(p.xp) < item.minLevel) return false;
            if (p.coins < item.price) return false;
            p.coins -= item.price;
            p.inventory.push(item.id);
            p.totals.purchases++;
            awardBadges(p);
            return true;
          }) ?? false,

        unlockArcade: (gameId) =>
          mutate((p) => {
            const game = findArcadeGame(gameId);
            const id = `arcade:${gameId}`;
            if (!game || game.price <= 0 || p.inventory.includes(id) || p.coins < game.price) return false;
            p.coins -= game.price;
            p.inventory.push(id);
            p.totals.purchases++;
            awardBadges(p);
            return true;
          }) ?? false,

        equip: (slot, itemId) => {
          const profile = activeProfile();
          if (!profile) return false;
          if (itemId === undefined) {
            if (!OPTIONAL_SLOTS.includes(slot)) return false;
          } else {
            const item = itemById(itemId);
            const owned = get().progress[profile.id]?.inventory.includes(itemId);
            if (!item || item.slot !== slot || !owned) return false;
          }
          const avatar: AvatarConfig = { ...profile.avatar };
          if (itemId === undefined) delete avatar[slot as 'hat' | 'glasses' | 'pet'];
          else avatar[slot] = itemId;
          get().updateProfile(profile.id, { avatar });
          return true;
        },

        setAvatar: (patch) => {
          const profile = activeProfile();
          if (!profile) return false;
          const allowed = {
            skin: (v: unknown) => SKIN_TONES.includes(v as string),
            hair: (v: unknown) => HAIR_STYLES.includes(v as AvatarConfig['hair']),
            hairColor: (v: unknown) => HAIR_COLORS.includes(v as string),
            eyes: (v: unknown) => EYES.includes(v as AvatarConfig['eyes']),
          } as const;
          const clean: Partial<AvatarConfig> = {};
          for (const [k, v] of Object.entries(patch)) {
            const check = allowed[k as keyof typeof allowed];
            if (!check || !check(v)) return false;
            (clean as Record<string, unknown>)[k] = v;
          }
          get().updateProfile(profile.id, { avatar: { ...profile.avatar, ...clean } });
          return true;
        },
      };
    },
    {
      name: 'bijak-app',
      version: 1,
      storage: createJSONStorage(() => kv),
      partialize: (s) => ({
        parent: s.parent,
        profiles: s.profiles,
        activeProfileId: s.activeProfileId,
        progress: s.progress,
        settings: s.settings,
        dirtyAt: s.dirtyAt,
        syncedAt: s.syncedAt,
        syncedRevision: s.syncedRevision,
      }),
      // Settings added in later versions get their defaults on devices with an older save.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<AppState>;
        return { ...current, ...saved, settings: { ...current.settings, ...saved.settings } };
      },
    },
  ),
);

/* ---------------------------------------------------------------- selectors */

export function useActiveProfile(): Profile | undefined {
  return useApp((s) => s.profiles.find((p) => p.id === s.activeProfileId));
}

const EMPTY = emptyProgress();

export function useProgress(): Progress {
  return useApp((s) => (s.activeProfileId ? s.progress[s.activeProfileId] : undefined) ?? EMPTY);
}

/** Streak shown to the child: drops to 0 once a school day is missed that no shield can cover. */
export function liveStreak(p: Progress, today = dayKey(), restDays: readonly number[] = []): number {
  return streakShown(p.streak, today, restDays);
}

/** Family rest days (reactive), for passing to `liveStreak` in screens. */
export const useRestDays = () => useApp((s) => s.settings.restDays ?? EMPTY_DAYS);
const EMPTY_DAYS: number[] = [];
