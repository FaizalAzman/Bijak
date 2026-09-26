/**
 * Module 2 + 4 — Local-first app state (Zustand persisted to on-device SQLite).
 * Holds the parent account, child profiles and each child's learning progress.
 * Every mutation bumps `dirtyAt` so the cloud sync service knows what to upload.
 */
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getContentIndex } from '@/features/content/registry';
import { newlyEarned, type BadgeDef } from '@/features/gamify/badges';
import { applyQuestEvent, generateDailyQuests, type Quest, type QuestEvent } from '@/features/gamify/quests';
import { DEFAULT_AVATAR, FREE_ITEMS, type AvatarConfig, type ShopItem, type Slot } from '@/features/gamify/shop';
import { REWARDS, xpForAnswer } from '@/features/gamify/xp';
import { dueCards, srsUpdate, type SrsContext } from '@/features/srs/srs';
import { addDays, dayKey } from '@/lib/date';
import { kv } from '@/lib/storage';
import type { Attempt, Parent, Profile, Progress, Settings } from './types';

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
}

interface AppState {
  parent: Parent | null;
  profiles: Profile[];
  activeProfileId: string | null;
  progress: Record<string, Progress>;
  settings: Settings;
  dirtyAt: number;
  syncedAt: number | null;

  setupFamily: (parentName: string) => void;
  addProfile: (p: { name: string; level: number; avatar?: AvatarConfig }) => string;
  updateProfile: (id: string, patch: Partial<Omit<Profile, 'id'>>) => void;
  removeProfile: (id: string) => void;
  selectProfile: (id: string | null) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetProgress: (id: string) => void;
  markSynced: (at: number) => void;

  ensureToday: () => void;
  answer: (a: AnswerInput) => number;
  finishQuiz: (f: FinishInput) => FinishReward;
  finishLesson: (i: { topicId: string; standardId: string; subjectId: string; seconds: number }) => FinishReward | null;
  claimQuest: (questId: string) => number;
  buy: (item: ShopItem) => boolean;
  unlockArcade: (gameId: string, price: number) => boolean;
  equip: (slot: Slot, itemId: string | undefined) => void;
  setAvatar: (patch: Partial<AvatarConfig>) => void;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function bumpStreak(p: Progress, today: string) {
  const { lastDay } = p.streak;
  if (lastDay === today) return;
  p.streak.current = lastDay === addDays(today, -1) ? p.streak.current + 1 : 1;
  p.streak.best = Math.max(p.streak.best, p.streak.current);
  p.streak.lastDay = today;
}

function dayStat(p: Progress, today: string) {
  p.days[today] ??= { answered: 0, correct: 0, seconds: {} };
  const keys = Object.keys(p.days).sort();
  if (keys.length > 120) for (const k of keys.slice(0, keys.length - 120)) delete p.days[k];
  return p.days[today];
}

function questEvent(p: Progress, e: QuestEvent): Quest[] {
  const { quests, completed } = applyQuestEvent(p.quests.list, e);
  p.quests.list = quests;
  return quests.filter((q) => completed.includes(q.id));
}

function awardBadges(p: Progress): BadgeDef[] {
  const earned = newlyEarned(p, getContentIndex());
  for (const b of earned) p.badges[b.id] = Date.now();
  return earned;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      /** Apply a mutation to the active child's progress. */
      const mutate = <R>(fn: (p: Progress, profile: Profile) => R): R | undefined => {
        const { activeProfileId, progress, profiles } = get();
        const profile = profiles.find((x) => x.id === activeProfileId);
        if (!profile) return undefined;
        const draft = clone(progress[profile.id] ?? emptyProgress());
        const result = fn(draft, profile);
        set({ progress: { ...progress, [profile.id]: draft }, dirtyAt: Date.now() });
        return result;
      };

      return {
        parent: null,
        profiles: [],
        activeProfileId: null,
        progress: {},
        settings: { sound: true, haptics: true, voice: true, autoRead: false },
        dirtyAt: 0,
        syncedAt: null,

        setupFamily: (name) => set({ parent: { name: name.trim(), createdAt: Date.now(), familyId: Crypto.randomUUID() }, dirtyAt: Date.now() }),

        addProfile: ({ name, level, avatar }) => {
          const id = Crypto.randomUUID();
          const profile: Profile = { id, name: name.trim(), level, avatar: avatar ?? DEFAULT_AVATAR, createdAt: Date.now() };
          set((s) => ({ profiles: [...s.profiles, profile], progress: { ...s.progress, [id]: emptyProgress() }, dirtyAt: Date.now() }));
          return id;
        },

        updateProfile: (id, patch) => set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)), dirtyAt: Date.now() })),

        removeProfile: (id) =>
          set((s) => {
            const progress = { ...s.progress };
            delete progress[id];
            return {
              profiles: s.profiles.filter((p) => p.id !== id),
              progress,
              activeProfileId: s.activeProfileId === id ? null : s.activeProfileId,
              dirtyAt: Date.now(),
            };
          }),

        selectProfile: (id) => {
          set({ activeProfileId: id });
          if (id) get().ensureToday();
        },

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        resetProgress: (id) => set((s) => ({ progress: { ...s.progress, [id]: emptyProgress() }, dirtyAt: Date.now() })),

        markSynced: (at) => set({ syncedAt: at }),

        ensureToday: () => {
          const today = dayKey();
          const { activeProfileId, progress, profiles } = get();
          const profile = profiles.find((p) => p.id === activeProfileId);
          if (!profile || progress[profile.id]?.quests.day === today) return;
          mutate((p) => {
            const std = getContentIndex().standardByLevel(profile.level);
            const subjects = (std?.subjects ?? []).filter((s) => s.topics.some((t) => t.quizzes.length > 0));
            p.quests = { day: today, list: generateDailyQuests(profile.id, today, subjects, dueCards(p.srs).length) };
          });
        },

        answer: ({ ctx, correct, combo, difficulty, review, fast }) =>
          mutate((p) => {
            const today = dayKey();
            const d = dayStat(p, today);
            d.answered++;
            p.totals.answered++;
            if (ctx.topicId) {
              p.topics[ctx.topicId] ??= { answered: 0, correct: 0, lessonDone: false, best: {}, lastAt: 0 };
              p.topics[ctx.topicId].answered++;
              p.topics[ctx.topicId].lastAt = Date.now();
            }
            const next = srsUpdate(p.srs[ctx.key], ctx, correct);
            if (next === null) delete p.srs[ctx.key];
            else if (next) p.srs[ctx.key] = next;

            questEvent(p, { type: 'answer', correct, combo });
            if (review) questEvent(p, { type: 'review', correct });
            if (!correct) return 0;

            d.correct++;
            p.totals.correct++;
            if (review) p.totals.reviews++;
            p.totals.bestCombo = Math.max(p.totals.bestCombo, combo);
            if (ctx.topicId) p.topics[ctx.topicId].correct++;
            const xp = xpForAnswer(difficulty, combo, fast);
            p.xp += xp;
            p.coins += REWARDS.coinPerCorrect;
            questEvent(p, { type: 'xp', amount: xp });
            return xp;
          }) ?? 0,

        finishQuiz: (f) =>
          mutate((p) => {
            // Nothing answered (e.g. a time-attack left idle): no rewards, no streak.
            if (f.total === 0) return { xp: 0, coins: 0, newBest: false, badges: [], questsDone: [], streak: p.streak.current };
            const today = dayKey();
            const perfect = f.total > 0 && f.correct === f.total;
            const timeAttack = f.mode === 'timeAttack';
            let xp = 0;
            let coins = 0;
            let newBest = false;

            if (timeAttack) {
              const prev = p.timeAttackBest[f.quizId] ?? 0;
              newBest = f.correct > prev;
              if (newBest) {
                p.timeAttackBest[f.quizId] = f.correct;
                xp += REWARDS.newBest.xp;
                coins += REWARDS.newBest.coins;
              }
              xp += f.correct * REWARDS.timeAttackPerCorrect;
            } else if (f.total > 0) {
              xp += REWARDS.quizComplete.xp;
              coins += REWARDS.quizComplete.coins;
              if (perfect) {
                xp += REWARDS.perfect.xp;
                coins += REWARDS.perfect.coins;
                p.totals.perfect++;
              }
            }
            if (f.topicId && f.total > 0) {
              p.topics[f.topicId] ??= { answered: 0, correct: 0, lessonDone: false, best: {}, lastAt: 0 };
              const score = Math.round((f.correct / f.total) * 100);
              const best = p.topics[f.topicId].best;
              best[f.quizId] = Math.max(best[f.quizId] ?? 0, score);
            }
            p.xp += xp;
            p.coins += coins;
            p.totals.quizzes++;
            bumpStreak(p, today);
            const d = dayStat(p, today);
            const key = `${f.standardId}/${f.subjectId}`;
            d.seconds[key] = (d.seconds[key] ?? 0) + f.seconds;
            p.attempts = [{ ...f, at: Date.now() }, ...p.attempts].slice(0, 200);

            const questsDone = [...questEvent(p, { type: 'quizComplete', subjectId: f.subjectId, perfect, timeAttack }), ...questEvent(p, { type: 'xp', amount: xp })];
            const badges = awardBadges(p);
            return { xp, coins, newBest, badges, questsDone, streak: p.streak.current };
          }) ?? { xp: 0, coins: 0, newBest: false, badges: [], questsDone: [], streak: 0 },

        finishLesson: ({ topicId, standardId, subjectId, seconds }) =>
          mutate((p) => {
            const today = dayKey();
            p.topics[topicId] ??= { answered: 0, correct: 0, lessonDone: false, best: {}, lastAt: 0 };
            const first = !p.topics[topicId].lessonDone;
            p.topics[topicId].lessonDone = true;
            p.topics[topicId].lastAt = Date.now();
            const d = dayStat(p, today);
            const key = `${standardId}/${subjectId}`;
            d.seconds[key] = (d.seconds[key] ?? 0) + seconds;
            bumpStreak(p, today);
            const xp = first ? REWARDS.lesson.xp : 5;
            const coins = first ? REWARDS.lesson.coins : 0;
            p.xp += xp;
            p.coins += coins;
            if (first) p.totals.lessons++;
            const questsDone = [...questEvent(p, { type: 'lesson' }), ...questEvent(p, { type: 'xp', amount: xp })];
            return { xp, coins, newBest: false, badges: awardBadges(p), questsDone, streak: p.streak.current };
          }) ?? null,

        claimQuest: (questId) =>
          mutate((p) => {
            const q = p.quests.list.find((x) => x.id === questId);
            if (!q || q.claimed || q.progress < q.target) return 0;
            q.claimed = true;
            p.coins += q.reward;
            return q.reward;
          }) ?? 0,

        buy: (item) =>
          mutate((p) => {
            if (p.inventory.includes(item.id) || p.coins < item.price) return false;
            p.coins -= item.price;
            p.inventory.push(item.id);
            p.totals.purchases++;
            awardBadges(p);
            return true;
          }) ?? false,

        unlockArcade: (gameId, price) =>
          mutate((p) => {
            const id = `arcade:${gameId}`;
            if (p.inventory.includes(id) || p.coins < price) return false;
            p.coins -= price;
            p.inventory.push(id);
            p.totals.purchases++;
            awardBadges(p);
            return true;
          }) ?? false,

        equip: (slot, itemId) => {
          const { activeProfileId, profiles } = get();
          const profile = profiles.find((p) => p.id === activeProfileId);
          if (!profile) return;
          get().updateProfile(profile.id, { avatar: { ...profile.avatar, [slot]: itemId } });
        },

        setAvatar: (patch) => {
          const { activeProfileId, profiles } = get();
          const profile = profiles.find((p) => p.id === activeProfileId);
          if (profile) get().updateProfile(profile.id, { avatar: { ...profile.avatar, ...patch } });
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
      }),
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

/** Streak shown to the child: drops to 0 once a whole day has been missed. */
export function liveStreak(p: Progress, today = dayKey()): number {
  const { lastDay, current } = p.streak;
  if (!lastDay) return 0;
  return lastDay === today || lastDay === addDays(today, -1) ? current : 0;
}
