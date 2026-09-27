import { addDays, DAY_MS, dayKey, lastNDays } from '@/lib/date';
import { formatDuration, groupDigits, pct, plural } from '@/lib/format';
import { hashString, int, pick, seeded, shuffle, shuffleNotIdentity } from '@/lib/random';

describe('date', () => {
  it('formats local calendar days with zero padding', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });

  it('uses the local day, not UTC (Malaysia is UTC+8)', () => {
    // 2026-03-01 23:30 UTC is already 2 March in Kuala Lumpur.
    expect(dayKey(new Date('2026-03-01T23:30:00Z'))).toBe('2026-03-02');
  });

  it.each([
    ['2026-01-31', 1, '2026-02-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2028-03-01', -1, '2028-02-29'], // leap year
    ['2026-12-31', 1, '2027-01-01'],
    ['2027-01-01', -1, '2026-12-31'],
    ['2026-06-15', 0, '2026-06-15'],
    ['2026-06-15', 30, '2026-07-15'],
    ['2026-06-15', -365, '2025-06-15'],
  ])('addDays(%s, %i) = %s', (from, delta, expected) => {
    expect(addDays(from, delta)).toBe(expected);
  });

  it('addDays round-trips for every day of a year', () => {
    let d = '2026-01-01';
    for (let i = 0; i < 400; i++) {
      const next = addDays(d, 1);
      expect(addDays(next, -1)).toBe(d);
      expect(next > d).toBe(true);
      d = next;
    }
  });

  it('lastNDays returns n consecutive days ending today, oldest first', () => {
    expect(lastNDays(3, '2026-03-01')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01']);
    expect(lastNDays(1, '2026-03-01')).toEqual(['2026-03-01']);
    expect(lastNDays(0, '2026-03-01')).toEqual([]);
  });

  it('DAY_MS is one day', () => {
    expect(DAY_MS).toBe(86_400_000);
  });
});

describe('format', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1 000'],
    [4725, '4 725'],
    [1000000, '1 000 000'],
    ['12345.50', '12 345.50'],
    ['0.05', '0.05'],
  ])('groupDigits(%p) = %p', (input, expected) => {
    expect(groupDigits(input)).toBe(expected);
  });

  it.each([
    [0, '0s'],
    [59.4, '59s'],
    [60, '1m'],
    [3599, '59m'],
    [3600, '1h 0m'],
    [5400, '1h 30m'],
  ])('formatDuration(%p) = %p', (s, expected) => {
    expect(formatDuration(s)).toBe(expected);
  });

  it('formatDuration writes hours as "j" (jam) in Bahasa Melayu', () => {
    expect([formatDuration(45, 'ms'), formatDuration(600, 'ms'), formatDuration(5400, 'ms')]).toEqual(['45s', '10m', '1j 30m']);
  });

  it('pct rounds and never divides by zero', () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(2, 3)).toBe(67);
    expect(pct(5, 0)).toBe(0);
    expect(pct(0, 10)).toBe(0);
  });

  it('plural picks the right word', () => {
    expect(plural(1, 'quiz', 'quizzes')).toBe('1 quiz');
    expect(plural(0, 'quiz', 'quizzes')).toBe('0 quizzes');
    expect(plural(2, 'day')).toBe('2 days');
  });
});

describe('random', () => {
  it('seeded generators are deterministic and stay in [0, 1)', () => {
    const a = seeded(42);
    const b = seeded(42);
    for (let i = 0; i < 1000; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds give different sequences', () => {
    const a = seeded(1);
    const b = seeded(2);
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
  });

  it('hashString is stable and spreads similar strings', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('p1:2026-01-01')).not.toBe(hashString('p1:2026-01-02'));
    expect(hashString('')).toBeGreaterThanOrEqual(0);
  });

  it('int is inclusive on both ends and covers the range', () => {
    const rng = seeded(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = int(rng, 3, 6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('pick only returns members', () => {
    const rng = seeded(3);
    for (let i = 0; i < 200; i++) expect(['a', 'b', 'c']).toContain(pick(rng, ['a', 'b', 'c']));
  });

  it('shuffle is a permutation and does not mutate its input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    const out = shuffle(input, seeded(9));
    expect(input).toEqual(copy);
    expect([...out].sort((x, y) => x - y)).toEqual(copy);
  });

  it('shuffleNotIdentity never returns the original order', () => {
    for (let seed = 0; seed < 300; seed++) {
      const input = ['a', 'b'];
      expect(shuffleNotIdentity(input, seeded(seed))).toEqual(['b', 'a']);
      const three = [1, 2, 3];
      expect(shuffleNotIdentity(three, seeded(seed))).not.toEqual(three);
    }
    expect(shuffleNotIdentity(['only'])).toEqual(['only']);
    // A generator stuck on the identity still yields a different order.
    expect(shuffleNotIdentity([1, 2, 3], () => 0.999999)).not.toEqual([1, 2, 3]);
  });
});
