/** Local calendar day key, e.g. "2026-09-26". Streaks and quests reset on local midnight. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + delta));
}

export function lastNDays(n: number, from: string = dayKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(from, i - (n - 1)));
}

export const DAY_MS = 24 * 60 * 60 * 1000;
