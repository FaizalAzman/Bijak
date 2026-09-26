/** Module 15 — Experience Points & Leveling Engine. */

/** Total XP required to *reach* `level` (level 1 starts at 0). 100, 300, 600, 1000… */
export const xpForLevel = (level: number) => 50 * level * (level - 1);

export function levelFromXp(xp: number): number {
  // Inverse of 50·L·(L−1) = xp  →  L = (1 + √(1 + xp/12.5)) / 2
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2));
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - floor, needed: next - floor, ratio: (xp - floor) / (next - floor) };
}

export const TIERS = [
  { from: 1, name: 'Rookie', emoji: '🐣' },
  { from: 5, name: 'Explorer', emoji: '🧭' },
  { from: 10, name: 'Scholar', emoji: '🎓' },
  { from: 15, name: 'Champion', emoji: '🏆' },
  { from: 20, name: 'Legend', emoji: '🐉' },
] as const;

export function tierFor(level: number) {
  return [...TIERS].reverse().find((t) => level >= t.from) ?? TIERS[0];
}

/** XP for one correct answer: harder questions and hot streaks earn more. */
export function xpForAnswer(difficulty: number, combo: number, fast = false): number {
  // Time-attack answers are quick recall, so they earn less each (the round bonus adds more).
  if (fast) return 2 + (combo >= 5 ? 2 : 0);
  const comboBonus = combo >= 3 ? Math.min(combo - 2, 5) * 2 : 0;
  return 5 + 5 * difficulty + comboBonus;
}

export const REWARDS = {
  quizComplete: { xp: 10, coins: 5 },
  perfect: { xp: 20, coins: 10 },
  coinPerCorrect: 1,
  lesson: { xp: 15, coins: 3 },
  timeAttackPerCorrect: 2,
  newBest: { xp: 15, coins: 10 },
};
