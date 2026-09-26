/**
 * Module 7 — Spaced Repetition System (Leitner boxes).
 *
 * A card is created the first time a question is answered wrongly. Each correct review
 * moves it up a box (longer gap); a mistake drops it back to box 0. After box 5 the
 * concept is considered mastered and the card retires. Getting a card right again before
 * it is due (e.g. replaying the same quiz) does not promote it — spacing is the point.
 */
import type { Question } from '@/features/content/schema';
import { DAY_MS } from '@/lib/date';

export interface SrsCard {
  key: string;
  quizId: string;
  standardId: string;
  subjectId: string;
  topicId?: string;
  q: Question;
  box: number;
  due: number;
  lapses: number;
  reviews: number;
  lastAt: number;
}

/** Gap (days) before the next review once a card reaches each box. */
export const BOX_INTERVAL_DAYS = [0, 1, 2, 4, 7, 14];
export const MASTERED_BOX = BOX_INTERVAL_DAYS.length;

export interface SrsContext {
  key: string;
  quizId: string;
  standardId: string;
  subjectId: string;
  topicId?: string;
  q: Question;
}

/** Returns the updated card, `null` when the card retires, or `undefined` when nothing should be tracked. */
export function srsUpdate(card: SrsCard | undefined, ctx: SrsContext, correct: boolean, now = Date.now()): SrsCard | null | undefined {
  if (!card) {
    if (correct) return undefined; // Known already — don't track.
    return { ...ctx, box: 0, due: now, lapses: 1, reviews: 0, lastAt: now };
  }
  if (!correct) return { ...card, q: ctx.q, box: 0, due: now, lapses: card.lapses + 1, reviews: card.reviews + 1, lastAt: now };
  if (card.due > now) return { ...card, q: ctx.q, lastAt: now };
  const box = card.box + 1;
  if (box >= MASTERED_BOX) return null;
  return { ...card, q: ctx.q, box, due: now + BOX_INTERVAL_DAYS[box] * DAY_MS, reviews: card.reviews + 1, lastAt: now };
}

export function dueCards(cards: Record<string, SrsCard>, now = Date.now(), limit = 10): SrsCard[] {
  return Object.values(cards)
    .filter((c) => c.due <= now)
    .sort((a, b) => a.due - b.due || b.lapses - a.lapses)
    .slice(0, limit);
}
