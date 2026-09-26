import { installCrashHandler, startFrameMonitor, telemetry } from '@/lib/telemetry';
import { kv } from '@/lib/storage';

beforeEach(() => {
  jest.useFakeTimers();
  telemetry.clear();
  telemetry.setSink(null);
  telemetry.setContext('app');
});
afterEach(() => jest.useRealTimers());

describe('telemetry', () => {
  it('records events, screens and errors with context', () => {
    telemetry.setContext('quiz:match');
    telemetry.event('opened', { n: 1 });
    telemetry.screen('home', 123.6);
    telemetry.error(new Error('boom'), { where: 'x' });
    const [ev, sc, err] = telemetry.records();
    expect(ev).toMatchObject({ kind: 'event', name: 'opened', data: { n: 1 } });
    expect(sc).toMatchObject({ kind: 'screen', name: 'home', data: { loadMs: 124 } });
    expect(err).toMatchObject({ kind: 'error', name: 'boom', data: { where: 'x', context: 'quiz:match' } });
    expect(telemetry.getContext()).toBe('quiz:match');
  });

  it('accepts non-Error throwables', () => {
    telemetry.error('plain string');
    expect(telemetry.records()[0].name).toBe('plain string');
  });

  it('keeps only the latest 300 records', () => {
    for (let i = 0; i < 350; i++) telemetry.event(`e${i}`);
    const r = telemetry.records();
    expect(r).toHaveLength(300);
    expect(r[0].name).toBe('e50');
  });

  it('forwards to a sink when one is registered (privacy: none by default)', () => {
    const sink = jest.fn();
    telemetry.event('a');
    expect(sink).not.toHaveBeenCalled();
    telemetry.setSink(sink);
    telemetry.event('b');
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ name: 'b' }));
  });

  it('flushes to local storage in the background, errors immediately', () => {
    telemetry.event('later');
    expect(JSON.parse(kv.getItem('bijak-telemetry') ?? '[]')).toEqual([]);
    jest.advanceTimersByTime(2000);
    expect(JSON.parse(kv.getItem('bijak-telemetry')!).map((r: { name: string }) => r.name)).toEqual(['later']);
    telemetry.error(new Error('now'));
    expect(JSON.parse(kv.getItem('bijak-telemetry')!).map((r: { name: string }) => r.name)).toEqual(['later', 'now']);
  });

  it('the crash handler records fatal errors and still calls the previous handler', () => {
    const prev = jest.fn();
    let handler: (e: unknown, fatal?: boolean) => void = () => undefined;
    (globalThis as { ErrorUtils?: unknown }).ErrorUtils = { getGlobalHandler: () => prev, setGlobalHandler: (h: typeof handler) => (handler = h) };
    installCrashHandler();
    handler(new Error('crash'), true);
    expect(prev).toHaveBeenCalled();
    expect(telemetry.records().at(-1)).toMatchObject({ kind: 'error', name: 'crash', data: { fatal: true } });
  });

  it('the frame monitor reports bursts of long frames against the current screen', () => {
    let now = 0;
    const frames: ((t: number) => void)[] = [];
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    global.requestAnimationFrame = ((cb: (t: number) => void) => frames.push(cb)) as typeof requestAnimationFrame;
    global.cancelAnimationFrame = jest.fn();
    telemetry.setContext('quiz:sort');
    const stop = startFrameMonitor();
    const frame = (t: number) => frames.shift()!(t);
    frame(0);
    for (const t of [100, 200, 300, 400]) frame(t); // four 100ms frames
    now = 6000;
    frame(416);
    stop();
    expect(telemetry.records().find((r) => r.kind === 'jank')).toMatchObject({ name: 'quiz:sort', data: { longFrames: 4, worstMs: 100 } });
  });
});
