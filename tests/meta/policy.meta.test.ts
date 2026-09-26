/**
 * Project rules from AGENTS.md, enforced on the source so they can't quietly regress:
 * calm motion, responsive layout, accessibility, privacy and where business logic lives.
 */
import { read, rel, screens, srcFiles } from './files';

const sources = srcFiles().map((f) => ({ file: rel(f), text: read(f) }));
const offenders = (pattern: RegExp, allow: string[] = []) => sources.filter((s) => pattern.test(s.text) && !allow.includes(s.file)).map((s) => s.file);

describe('calm motion (no looping, bouncy or staggered animation)', () => {
  it('no repeating animations', () => expect(offenders(/withRepeat\(/)).toEqual([]));
  it('no springs or bounces', () => expect(offenders(/withSpring\(|\.springify\(|Easing\.(bounce|elastic|back)\b/)).toEqual([]));
  it('no staggered entrances (delays are only for the milestone confetti)', () => {
    expect(offenders(/withDelay\(|\b(FadeIn\w*|SlideIn\w*|ZoomIn\w*|BounceIn\w*)\b[^;\n]*\.delay\(/, ['src/components/gamify/Confetti.tsx'])).toEqual([]);
  });
});

describe('responsive layout', () => {
  it('no fixed percentage widths except full width (use Grid); two drawing exceptions', () => {
    const bad = sources.flatMap((s) =>
      [...s.text.matchAll(/width: '(\d+)%'/g)].filter((m) => m[1] !== '100').map(() => s.file),
    );
    expect([...new Set(bad)].sort()).toEqual(['src/components/parent/Charts.tsx', 'src/components/quiz/Match.tsx']);
  });

  it('every screen is wrapped in <Screen> (safe areas, frame width, gutters)', () => {
    const missing = screens()
      .map(rel)
      .filter((f) => f !== 'src/app/index.tsx') // redirect-only gate
      .filter((f) => !read(f).includes('<Screen'));
    expect(missing).toEqual([]);
  });
});

describe('accessibility', () => {
  it('every Pressable declares a role for screen readers', () => {
    const bad: string[] = [];
    for (const s of sources) {
      for (const m of s.text.matchAll(/<Pressable\b([\s\S]*?)(?<![=])>/g)) if (!/accessibilityRole=/.test(m[1])) bad.push(`${s.file}:${s.text.slice(0, m.index).split('\n').length}`);
    }
    expect(bad).toEqual([]);
  });

  it('text never scales past the chunky layouts (maxFontSizeMultiplier is always capped)', () => {
    expect(read('src/components/ui/Txt.tsx')).toMatch(/maxFontSizeMultiplier = 1\.4/);
  });
});

describe('architecture', () => {
  it('only the content registry and cloud sync talk to the network (child privacy)', () => {
    expect(offenders(/\bfetch\(/)).toEqual(['src/features/content/registry.ts', 'src/features/sync/services.ts']);
  });

  it('screens and components never write store state directly (rules live in the store)', () => {
    expect(offenders(/use(App|Content)\.setState\(/).filter((f) => f.startsWith('src/app/') || f.startsWith('src/components/'))).toEqual([]);
  });

  it('storage goes through the local-first kv layer', () => {
    expect(offenders(/localStorage|AsyncStorage/, ['src/lib/storage.web.ts'])).toEqual([]);
  });

  it('no stray console logging (use telemetry) and no leftover TODOs', () => {
    expect(offenders(/console\.(log|warn|error|info)\(/)).toEqual([]);
    expect(offenders(/\b(TODO|FIXME|XXX)\b/)).toEqual([]);
  });
});
