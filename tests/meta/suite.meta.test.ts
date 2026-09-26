/**
 * Tests about the test suite itself: it must reach every source file, stay deterministic,
 * never be left focused or skipped, and name every business rule it claims to protect.
 */
import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { STATIC_BADGES } from '@/features/gamify/badges';
import { REWARDS } from '@/features/gamify/xp';
import { useApp } from '@/store/app';
import { read, rel, ROOT, srcFiles, testFiles } from './files';

const tests = testFiles();
const specs = tests.filter((f) => /\.test\.tsx?$/.test(f));
const testText = tests.map(read).join('\n');

function resolveSpec(from: string, spec: string): string | null {
  const base = spec.startsWith('@/') ? join(ROOT, 'src', spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(from), spec) : spec.startsWith('src/') ? join(ROOT, spec) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Static import graph: import/export-from/require/jest.mock/requireActual, plus src paths named in tests. */
function edges(file: string): string[] {
  const text = read(file);
  const specs = [...text.matchAll(/(?:from\s+|require\(\s*|import\(\s*|jest\.(?:mock|requireActual|requireMock)\(\s*)['"]([^'"]+)['"]/g)].map((m) => m[1]);
  if (file.includes('/tests/')) specs.push(...[...text.matchAll(/['"`](src\/[^'"`]+\.tsx?)['"`]/g)].map((m) => m[1]));
  return specs.map((s) => resolveSpec(file, s)).filter((x): x is string => !!x);
}

it('the suite loads every source file (no untested corners)', () => {
  const seen = new Set<string>();
  const queue = [...specs];
  while (queue.length) {
    const f = queue.pop()!;
    for (const next of edges(f)) if (!seen.has(next)) (seen.add(next), queue.push(next));
  }
  const unreached = srcFiles()
    .filter((f) => !f.endsWith('.d.ts') && !seen.has(f))
    .map(rel);
  expect(unreached).toEqual([]);
});

it('has every kind of test: unit, store rules, components, flows and meta', () => {
  for (const dir of ['unit', 'store', 'components', 'flows', 'meta']) expect(specs.some((f) => f.includes(`/tests/${dir}/`))).toBe(true);
});

it('no focused or skipped tests are committed', () => {
  const bad = tests.filter((f) => /\b(it|test|describe)\.(only|skip)\(|\b(xit|xtest|xdescribe|fit|fdescribe)\(/.test(read(f))).map(rel);
  expect(bad).toEqual([]);
});

it('every test file asserts something', () => {
  expect(specs.filter((f) => !read(f).includes('expect(')).map(rel)).toEqual([]);
});

it('tests are deterministic: no unseeded randomness', () => {
  expect(tests.filter((f) => /Math\.random\(/.test(read(f).replace(/\/\/.*$/gm, ''))).map(rel)).toEqual([]);
});

it('every store action is exercised by a test', () => {
  const actions = Object.entries(useApp.getState())
    .filter(([, v]) => typeof v === 'function')
    .map(([k]) => k);
  expect(actions.length).toBeGreaterThan(15);
  expect(actions.filter((a) => !new RegExp(`\\.${a}\\(|\\b${a}:`).test(testText))).toEqual([]);
});

it('every reward rule is referenced by a test', () => {
  expect(Object.keys(REWARDS).filter((k) => !testText.includes(`REWARDS.${k}`))).toEqual([]);
});

it('every badge is covered by a test', () => {
  expect(STATIC_BADGES.map((b) => b.id).filter((id) => !testText.includes(`'${id}'`))).toEqual([]);
});
