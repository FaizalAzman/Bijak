import { buildIndex, buildQuizQuestions, effectiveStandards, getContentIndex, questionKey, useContent } from '@/features/content/registry';
import { Quiz, Standard } from '@/features/content/schema';
import { seeded } from '@/lib/random';
import manifest from '../../content/manifest.json';
import { resetStores } from '../helpers';

const std7 = (over: Record<string, unknown> = {}) => ({
  id: 'std7',
  level: 7,
  title: 'Standard 7',
  version: 1,
  subjects: [{ id: 'math', name: 'Maths', emoji: '🔢', topics: [{ id: 's7-t1', title: 'Algebra', quizzes: [{ id: 's7-q1', title: 'Q', generator: { kind: 'addition', max: 50 } }] }] }],
  arcade: [{ id: 's7-dash', title: 'Dash', emoji: '⚡', price: 60, subjectId: 'math', quiz: { id: 's7-dash-q', title: 'Dash', mode: 'timeAttack', generator: { kind: 'addition', max: 50 } } }],
  ...over,
});

type Routes = Record<string, { status?: number; body: unknown }>;
function mockServer(routes: Routes) {
  const fetchMock = jest.fn(async (url: string) => {
    const r = routes[url];
    if (!r) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: (r.status ?? 200) < 400, status: r.status ?? 200, json: async () => r.body };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const BASE = 'https://content.example.com/bijak';
const manifestWith = (...extra: { id: string; level: number; version: number; file: string }[]) => ({ schema: 1, standards: [...manifest.standards, ...extra] });

beforeEach(() => {
  resetStores();
  useContent.getState().setSourceUrl(`${BASE}///`);
});

describe('bundled content', () => {
  it('ships every standard listed in the manifest, sorted by level', () => {
    const idx = getContentIndex();
    expect(idx.standards.map((s) => s.id)).toEqual(manifest.standards.map((s) => s.id));
    idx.standards.forEach((s, i) => i && expect(s.level).toBeGreaterThan(idx.standards[i - 1].level));
  });

  it('indexes topics, quizzes, subjects and arcade games', () => {
    const idx = getContentIndex();
    const std3 = idx.standardByLevel(3)!;
    const topic = std3.subjects[0].topics[0];
    expect(idx.topic(topic.id)?.topic).toBe(topic);
    expect(idx.topic(topic.id)?.standard).toBe(std3);
    const quiz = topic.quizzes[0];
    expect(idx.quiz(quiz.id)?.topic).toBe(topic);
    expect(idx.subject(std3.id, std3.subjects[0].id)).toBe(std3.subjects[0]);
    expect(idx.standard('nope')).toBeUndefined();
    for (const g of std3.arcade) {
      const ref = idx.quiz(g.quiz.id)!;
      expect(ref.arcade).toBe(g);
      expect(ref.topic).toBeUndefined();
      expect(ref.subject.id).toBe(g.subjectId);
    }
  });

  it('caches the index until remote content changes', () => {
    expect(getContentIndex()).toBe(getContentIndex());
  });

  it('questionKey is quiz-scoped', () => {
    expect(questionKey('quiz-a', { id: 'q1' } as never)).toBe('quiz-a::q1');
  });
});

describe('buildQuizQuestions', () => {
  const gen = Quiz.parse({ id: 'g', title: 'G', generator: { kind: 'addition', max: 100 } });
  const authored = Quiz.parse({
    id: 'a',
    title: 'A',
    questions: Array.from({ length: 8 }, (_, i) => ({ id: `q${i}`, type: 'trueFalse', prompt: `Q${i}`, answer: true })),
  });

  it('draws 10 generated questions by default, or `count`', () => {
    expect(buildQuizQuestions(gen, seeded(1))).toHaveLength(10);
    expect(buildQuizQuestions({ ...gen, count: 4 }, seeded(1))).toHaveLength(4);
  });

  it('time attacks draw 80 quick multiple-choice questions', () => {
    const qs = buildQuizQuestions({ ...gen, mode: 'timeAttack' }, seeded(1));
    expect(qs).toHaveLength(80);
    expect(qs.every((q) => q.type === 'mcq')).toBe(true);
  });

  it('keeps authored order when shuffle is off, and shuffles otherwise', () => {
    expect(buildQuizQuestions({ ...authored, shuffle: false }).map((q) => q.id)).toEqual(authored.questions.map((q) => q.id));
    const shuffled = buildQuizQuestions(authored, seeded(3)).map((q) => q.id);
    expect([...shuffled].sort()).toEqual(authored.questions.map((q) => q.id).sort());
    expect(shuffled).not.toEqual(authored.questions.map((q) => q.id));
  });

  it('`count` limits authored pools', () => {
    expect(buildQuizQuestions({ ...authored, count: 3 }, seeded(2))).toHaveLength(3);
  });
});

describe('effectiveStandards', () => {
  it('remote payloads override bundled ones only with a higher version', () => {
    const bundled3 = getContentIndex().standardByLevel(3)!;
    const older = { ...bundled3, version: bundled3.version, title: 'Old' };
    const newer = { ...bundled3, version: bundled3.version + 1, title: 'New' };
    expect(effectiveStandards({ std3: older }).find((s) => s.id === 'std3')?.title).not.toBe('Old');
    expect(effectiveStandards({ std3: newer }).find((s) => s.id === 'std3')?.title).toBe('New');
  });
});

describe('checkForUpdates', () => {
  it('does nothing without a content URL', async () => {
    useContent.setState({ sourceUrl: '' });
    const fetchMock = mockServer({});
    expect(await useContent.getState().checkForUpdates()).toEqual({ updated: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('downloads a new standard, validates it, and makes it appear everywhere', async () => {
    const fetchMock = mockServer({
      [`${BASE}/manifest.json`]: { body: manifestWith({ id: 'std7', level: 7, version: 1, file: 'standards/std7.json' }) },
      [`${BASE}/standards/std7.json`]: { body: std7() },
    });
    const before = getContentIndex();
    expect(await useContent.getState().checkForUpdates()).toEqual({ updated: ['std7'] });
    // Only the new file is fetched; bundled standards are already up to date.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const after = getContentIndex();
    expect(after).not.toBe(before);
    expect(after.standardByLevel(7)?.title).toBe('Standard 7');
    expect(after.quiz('s7-dash-q')?.arcade?.price).toBe(60);
    expect(useContent.getState().lastError).toBeNull();
    expect(useContent.getState().lastCheckedAt).not.toBeNull();
  });

  it('skips payloads that are not newer', async () => {
    const fetchMock = mockServer({ [`${BASE}/manifest.json`]: { body: manifestWith() } });
    expect(await useContent.getState().checkForUpdates()).toEqual({ updated: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['manifest HTTP error', { [`${BASE}/manifest.json`]: { status: 500, body: {} } }, /manifest HTTP 500/],
    ['bad manifest', { [`${BASE}/manifest.json`]: { body: { schema: 2 } } }, /./],
    [
      'invalid standard payload',
      { [`${BASE}/manifest.json`]: { body: manifestWith({ id: 'std7', level: 7, version: 1, file: 's7.json' }) }, [`${BASE}/s7.json`]: { body: { id: 'std7' } } },
      /Invalid standard payload/,
    ],
    [
      'file with a different id',
      { [`${BASE}/manifest.json`]: { body: manifestWith({ id: 'std7', level: 7, version: 1, file: 's7.json' }) }, [`${BASE}/s7.json`]: { body: std7({ id: 'std8', level: 8 }) } },
      /contains "std8", expected "std7"/,
    ],
    [
      'ids that clash with another standard',
      {
        [`${BASE}/manifest.json`]: { body: manifestWith({ id: 'std7', level: 7, version: 1, file: 's7.json' }) },
        [`${BASE}/s7.json`]: { body: std7({ subjects: [{ id: 'math', name: 'M', emoji: 'x', topics: [{ id: getContentIndex().standardByLevel(3)!.subjects[0].topics[0].id, title: 'Clash' }] }] }) },
      },
      /clash/,
    ],
    ['missing file', { [`${BASE}/manifest.json`]: { body: manifestWith({ id: 'std7', level: 7, version: 1, file: 'gone.json' }) } }, /gone.json HTTP 404/],
  ])('rejects the whole update on %s', async (_, routes, message) => {
    mockServer(routes as Routes);
    const before = getContentIndex();
    expect(await useContent.getState().checkForUpdates()).toEqual({ updated: [] });
    expect(useContent.getState().remote).toEqual({});
    expect(useContent.getState().lastError).toMatch(message);
    expect(getContentIndex()).toBe(before);
    expect(useContent.getState().checking).toBe(false);
  });

  it('ignores a second check while one is running', async () => {
    let release!: () => void;
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ ok: true, status: 200, json: async () => manifestWith() } as Response);
        }),
    ) as unknown as typeof fetch;
    const first = useContent.getState().checkForUpdates();
    expect(await useContent.getState().checkForUpdates()).toEqual({ updated: [] });
    release();
    await first;
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('clearRemote goes back to the built-in syllabus', async () => {
    mockServer({
      [`${BASE}/manifest.json`]: { body: manifestWith({ id: 'std7', level: 7, version: 1, file: 's7.json' }) },
      [`${BASE}/s7.json`]: { body: std7() },
    });
    await useContent.getState().checkForUpdates();
    useContent.getState().clearRemote();
    expect(getContentIndex().standardByLevel(7)).toBeUndefined();
  });

  it('setSourceUrl trims whitespace and trailing slashes', () => {
    useContent.getState().setSourceUrl('  https://x.dev/c//  ');
    expect(useContent.getState().sourceUrl).toBe('https://x.dev/c');
  });
});

it('a remote payload survives JSON persistence round-trips', () => {
  const parsed = Standard.parse(std7());
  expect(Standard.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  expect(buildIndex([parsed]).quiz('s7-q1')?.topic?.id).toBe('s7-t1');
});
