import type { Quest } from '@/features/gamify/quests';
import type { AvatarConfig, Slot } from '@/features/gamify/shop';
import type { SrsCard } from '@/features/srs/srs';

export interface Profile {
  id: string;
  name: string;
  /** KSSR year the child is currently in; drives the default standard shown. */
  level: number;
  avatar: AvatarConfig;
  createdAt: number;
}

export interface Attempt {
  quizId: string;
  topicId?: string;
  standardId: string;
  subjectId: string;
  title: string;
  mode: 'practice' | 'timeAttack' | 'review';
  correct: number;
  total: number;
  seconds: number;
  at: number;
}

export interface TopicStat {
  answered: number;
  correct: number;
  lessonDone: boolean;
  /** Best score (0–100) per quiz id. */
  best: Record<string, number>;
  lastAt: number;
}

export interface DayStat {
  answered: number;
  correct: number;
  /** Seconds spent, keyed by `${standardId}/${subjectId}`. */
  seconds: Record<string, number>;
}

export interface Progress {
  xp: number;
  coins: number;
  streak: { current: number; best: number; lastDay: string | null };
  quests: { day: string; list: Quest[] };
  inventory: string[];
  badges: Record<string, number>;
  srs: Record<string, SrsCard>;
  topics: Record<string, TopicStat>;
  days: Record<string, DayStat>;
  attempts: Attempt[];
  totals: {
    answered: number;
    correct: number;
    quizzes: number;
    perfect: number;
    lessons: number;
    reviews: number;
    bestCombo: number;
    purchases: number;
  };
  timeAttackBest: Record<string, number>;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  voice: boolean;
  /** Read each question aloud automatically. */
  autoRead: boolean;
}

export interface Parent {
  name: string;
  createdAt: number;
  familyId: string;
}

export type { Slot };
