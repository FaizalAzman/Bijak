/** "4725" → "4 725" (Malaysian textbooks group thousands with a space). */
export function groupDigits(n: number | string): string {
  const [int, dec] = String(n).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return dec ? `${grouped}.${dec}` : grouped;
}

/** "45s", "12m", "1h 5m" — or "1j 5m" in Bahasa Melayu (jam, minit, saat). */
export function formatDuration(seconds: number, lang: 'en' | 'ms' = 'en'): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}${lang === 'ms' ? 'j' : 'h'} ${m % 60}m`;
}

export function pct(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}

/** plural(1, 'quiz', 'quizzes') → "1 quiz" */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
