import type { Lang } from '@/features/content/schema';
import type { UiLang } from '@/i18n/define';
import type { Reminders } from '@/features/reminders/plan';
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
  /**
   * Language the child's school teaches Maths & Science in: 'en' for DLP classes, 'ms' otherwise.
   * Subjects with a translation in this language are shown in it. Defaults to 'en'.
   */
  medium?: Lang;
  /** Topic the class is on at school right now, per subject id (set by a parent). */
  schoolTopics?: Record<string, string>;
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
  /** Right answers that needed a hint (each counts half in the score). */
  hinted?: number;
}

export interface TopicStat {
  answered: number;
  correct: number;
  lessonDone: boolean;
  /** Best score (0–100) per quiz id. */
  best: Record<string, number>;
  lastAt: number;
  /** When the topic was first mastered (every quiz at 80%+, or its lesson read if it has no quiz). */
  masteredAt?: number;
  /** Day a re-read of this lesson last earned XP (re-reads earn XP once per day). */
  lessonXpDay?: string;
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
  streak: {
    current: number;
    best: number;
    lastDay: string | null;
    /** Rest-day shields waiting to be used (see features/gamify/streak.ts). */
    shields?: number;
    /** Recent days a shield covered. */
    shielded?: string[];
  };
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
  /** Today's paid bonuses: `quizId` → completion bonus day, `quizId:perfect` → perfect bonus day. */
  quizBonusDay?: Record<string, string>;
}

export interface Settings {
  /** Language of the app's buttons, messages and reports (content follows each child's teaching language). */
  uiLang: UiLang;
  sound: boolean;
  haptics: boolean;
  voice: boolean;
  /** Read each question aloud automatically. */
  autoRead: boolean;
  /** Weekdays that never break a streak (0 = Sunday … 6 = Saturday), set by a parent. */
  restDays: number[];
  /** Read-aloud voice a parent picked per language (a device voice id); the best one when unset. */
  voices?: Partial<Record<Lang, string>>;
  /** Gentle reminders (off until a parent turns them on). */
  reminders?: Reminders;
}

/** What `updateSettings` accepts: voice and reminder choices merge into the saved ones. */
export type SettingsPatch = Partial<Omit<Settings, 'reminders'>> & { reminders?: Partial<Reminders> };

export interface Parent {
  name: string;
  createdAt: number;
  familyId: string;
}

export type { Slot };
