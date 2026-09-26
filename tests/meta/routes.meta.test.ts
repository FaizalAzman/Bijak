/** Every place the app navigates to must be a real screen (no dead links after refactors). */
import { read, rel, routes, srcFiles } from './files';

/** Navigation targets written in the source: router.push/replace/navigate(...) and href props. */
function targets() {
  const out: { where: string; target: string }[] = [];
  for (const file of srcFiles()) {
    read(file)
      .split('\n')
      .forEach((line, i) => {
        if (!/router\.(push|replace|navigate)\(|href=|<Redirect/.test(line)) return;
        for (const m of line.matchAll(/(['"`])(\/[^'"`]*)\1/g)) {
          const target = m[2].replace(/\$\{[^}]+\}/g, 'X').split('?')[0];
          out.push({ where: `${rel(file)}:${i + 1}`, target });
        }
      });
  }
  return out;
}

const all = routes();

it('finds the screens and the links (sanity check of the scanner)', () => {
  expect(all.map((r) => r.url)).toEqual(expect.arrayContaining(['/', '/home', '/shop', '/quiz/[quizId]', '/parent', '/parent/dashboard', '/subject/[standardId]/[subjectId]']));
  expect(targets().length).toBeGreaterThan(20);
});

it.each(targets().map((t) => [t.target, t.where] as const))('link %s (%s) opens a real screen', (target) => {
  expect(all.some((r) => r.pattern.test(target))).toBe(true);
});

it('every screen can be reached from somewhere (no orphan screens)', () => {
  const linked = targets().map((t) => t.target);
  const tabs = ['/home', '/learn', '/quests', '/shop', '/me'];
  for (const r of all) {
    if (tabs.includes(r.url) || r.url === '/') continue;
    expect(`${r.url}: ${linked.some((t) => r.pattern.test(t)) ? 'linked' : 'orphan'}`).toBe(`${r.url}: linked`);
  }
});
