/**
 * Module 3 — Dynamic Content Delivery.
 *
 * Bundled payloads ship with the app so it works offline on first launch. When a content
 * URL is configured (EXPO_PUBLIC_CONTENT_URL or Parent ▸ Content), newer payloads listed
 * in the remote manifest are downloaded, validated and cached in local SQLite. Cached
 * payloads override bundled ones with a lower version, and remote-only standards
 * (e.g. Standard 7) appear automatically.
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import std1 from '../../../content/standards/std1.json';
import std2 from '../../../content/standards/std2.json';
import std3 from '../../../content/standards/std3.json';
import std4 from '../../../content/standards/std4.json';
import std5 from '../../../content/standards/std5.json';
import std6 from '../../../content/standards/std6.json';
import { kv } from '@/lib/storage';
import { telemetry } from '@/lib/telemetry';
import { generate } from './generators';
import { Manifest, Standard, type ArcadeGame, type Question, type Quiz, type Subject, type Topic } from './schema';
import { crossStandardIssues, parseStandard } from './validate';
import { shuffle, type Rng } from '@/lib/random';

const bundled: Standard[] = [std1, std2, std3, std4, std5, std6].map((raw) => Standard.parse(raw));

interface ContentState {
  remote: Record<string, Standard>;
  sourceUrl: string;
  lastCheckedAt: number | null;
  lastError: string | null;
  checking: boolean;
  setSourceUrl: (url: string) => void;
  checkForUpdates: () => Promise<{ updated: string[] }>;
  clearRemote: () => void;
}

export const useContent = create<ContentState>()(
  persist(
    (set, get) => ({
      remote: {},
      sourceUrl: process.env.EXPO_PUBLIC_CONTENT_URL ?? '',
      lastCheckedAt: null,
      lastError: null,
      checking: false,
      setSourceUrl: (sourceUrl) => set({ sourceUrl: sourceUrl.trim().replace(/\/+$/, '') }),
      clearRemote: () => set({ remote: {}, lastError: null }),
      checkForUpdates: async () => {
        const base = get().sourceUrl;
        if (!base || get().checking) return { updated: [] };
        set({ checking: true, lastError: null });
        // Nothing counts as updated unless the whole check succeeds (updates are all-or-nothing).
        let updated: string[] = [];
        try {
          const res = await fetch(`${base}/manifest.json`, { cache: 'no-store' });
          if (!res.ok) throw new Error(`manifest HTTP ${res.status}`);
          const manifest = Manifest.parse(await res.json());
          const current = new Map(effectiveStandards(get().remote).map((s) => [s.id, s.version]));
          const remote = { ...get().remote };
          const downloaded: string[] = [];
          for (const entry of manifest.standards) {
            if ((current.get(entry.id) ?? -1) >= entry.version) continue;
            const r = await fetch(`${base}/${entry.file}`, { cache: 'no-store' });
            if (!r.ok) throw new Error(`${entry.file} HTTP ${r.status}`);
            const std = parseStandard(await r.json());
            if (std.id !== entry.id) throw new Error(`${entry.file} contains "${std.id}", expected "${entry.id}"`);
            remote[entry.id] = std;
            downloaded.push(entry.id);
          }
          // Reject the whole update if it would clash with ids in other standards.
          const clashes = crossStandardIssues(effectiveStandards(remote));
          if (clashes.length) throw new Error(`Content ids clash: ${clashes.slice(0, 3).join('; ')}`);
          set({ remote, lastCheckedAt: Date.now() });
          updated = downloaded;
          telemetry.event('content_check', { updated: updated.join(',') || 'none' });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          set({ lastError: msg, lastCheckedAt: Date.now() });
          telemetry.event('content_check_failed', { error: msg });
        } finally {
          set({ checking: false });
        }
        return { updated };
      },
    }),
    {
      name: 'bijak-content',
      storage: createJSONStorage(() => kv),
      partialize: (s) => ({ remote: s.remote, sourceUrl: s.sourceUrl, lastCheckedAt: s.lastCheckedAt }),
    },
  ),
);

export function effectiveStandards(remote: Record<string, Standard>): Standard[] {
  const byId = new Map<string, Standard>(bundled.map((s) => [s.id, s]));
  for (const r of Object.values(remote)) {
    const b = byId.get(r.id);
    if (!b || r.version > b.version) byId.set(r.id, r);
  }
  return [...byId.values()].sort((a, b) => a.level - b.level);
}

/* ------------------------------------------------------------------ Index */

export interface TopicRef {
  standard: Standard;
  subject: Subject;
  topic: Topic;
}
export interface QuizRef {
  standard: Standard;
  subject: Subject;
  topic?: Topic;
  arcade?: ArcadeGame;
  quiz: Quiz;
}

export interface ContentIndex {
  standards: Standard[];
  standard: (id: string) => Standard | undefined;
  standardByLevel: (level: number) => Standard | undefined;
  subject: (standardId: string, subjectId: string) => Subject | undefined;
  topic: (topicId: string) => TopicRef | undefined;
  quiz: (quizId: string) => QuizRef | undefined;
}

export function buildIndex(standards: Standard[]): ContentIndex {
  const topics = new Map<string, TopicRef>();
  const quizzes = new Map<string, QuizRef>();
  for (const standard of standards) {
    for (const subject of standard.subjects) {
      for (const topic of subject.topics) {
        topics.set(topic.id, { standard, subject, topic });
        for (const quiz of topic.quizzes) quizzes.set(quiz.id, { standard, subject, topic, quiz });
      }
    }
    for (const arcade of standard.arcade) {
      const subject = standard.subjects.find((s) => s.id === arcade.subjectId) ?? standard.subjects[0];
      quizzes.set(arcade.quiz.id, { standard, subject, arcade, quiz: arcade.quiz });
    }
  }
  return {
    standards,
    standard: (id) => standards.find((s) => s.id === id),
    standardByLevel: (level) => standards.find((s) => s.level === level),
    subject: (sid, subId) => standards.find((s) => s.id === sid)?.subjects.find((s) => s.id === subId),
    topic: (id) => topics.get(id),
    quiz: (id) => quizzes.get(id),
  };
}

let cached: { remote: Record<string, Standard>; index: ContentIndex } | null = null;

/** Non-hook accessor (for stores / services). */
export function getContentIndex(): ContentIndex {
  const remote = useContent.getState().remote;
  if (!cached || cached.remote !== remote) cached = { remote, index: buildIndex(effectiveStandards(remote)) };
  return cached.index;
}

export function useContentIndex(): ContentIndex {
  const remote = useContent((s) => s.remote);
  return useMemo(() => {
    void remote;
    return getContentIndex();
  }, [remote]);
}

/* ------------------------------------------------------------------ Quiz building */

/** Global, stable key for a question — used by SRS and analytics. */
export const questionKey = (quizId: string, q: Question) => `${quizId}::${q.id}`;

export function buildQuizQuestions(quiz: Quiz, rng: Rng = Math.random): Question[] {
  if (quiz.generator) {
    const count = quiz.mode === 'timeAttack' ? 80 : (quiz.count ?? 10);
    return generate(quiz.generator, count, rng, quiz.mode === 'timeAttack' ? 'mcq' : 'numpad');
  }
  const qs = quiz.shuffle ? shuffle(quiz.questions, rng) : [...quiz.questions];
  return quiz.count ? qs.slice(0, quiz.count) : qs;
}
