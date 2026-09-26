/** Small deterministic PRNG (mulberry32) so daily quests / shuffles can be reproducible. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Rng = () => number;

export const int = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

export const pick = <T>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle, but never return the original order (for "put in order" puzzles). */
export function shuffleNotIdentity<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  if (arr.length < 2) return [...arr];
  for (let i = 0; i < 8; i++) {
    const s = shuffle(arr, rng);
    if (s.some((v, idx) => v !== arr[idx])) return s;
  }
  return [...arr].reverse();
}
