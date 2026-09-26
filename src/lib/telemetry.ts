/**
 * Module 5 — Telemetry & Performance Monitoring.
 *
 * Privacy-first: nothing leaves the device unless a sink is registered (e.g. Sentry,
 * PostHog) via `telemetry.setSink`. Records crashes, screen load times and dropped-frame
 * bursts tagged with the current screen / quiz engine, so the Parent ▸ App health page
 * can show which interaction is causing UI lag.
 */
import { kv } from './storage';

export type TelemetryKind = 'event' | 'error' | 'screen' | 'jank';

export interface TelemetryRecord {
  kind: TelemetryKind;
  name: string;
  at: number;
  data?: Record<string, string | number | boolean>;
}

type Sink = (r: TelemetryRecord) => void;

const KEY = 'bijak-telemetry';
const MAX = 300;

let buffer: TelemetryRecord[] = (() => {
  try {
    return JSON.parse(kv.getItem(KEY) ?? '[]') as TelemetryRecord[];
  } catch {
    return [];
  }
})();
let sink: Sink | null = null;
let context = 'app';
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  flushTimer = null;
  try {
    kv.setItem(KEY, JSON.stringify(buffer));
  } catch {
    /* storage full / unavailable — keep in memory */
  }
}

function record(r: TelemetryRecord) {
  buffer.push(r);
  if (buffer.length > MAX) buffer = buffer.slice(-MAX);
  sink?.(r);
  if (!flushTimer) {
    flushTimer = setTimeout(flush, 2000);
    // Node (tests, scripts) shouldn't stay alive just to flush; RN timers have no unref.
    (flushTimer as { unref?: () => void }).unref?.();
  }
}

export const telemetry = {
  setSink(s: Sink | null) {
    sink = s;
  },
  /** Current UI context, e.g. "quiz:match" — attached to jank records. */
  setContext(c: string) {
    context = c;
  },
  getContext: () => context,
  event(name: string, data?: TelemetryRecord['data']) {
    record({ kind: 'event', name, at: Date.now(), data });
  },
  error(error: unknown, data?: TelemetryRecord['data']) {
    const e = error instanceof Error ? error : new Error(String(error));
    record({ kind: 'error', name: e.message.slice(0, 200), at: Date.now(), data: { ...data, context, stack: (e.stack ?? '').slice(0, 500) } });
    flush();
  },
  screen(name: string, loadMs: number) {
    record({ kind: 'screen', name, at: Date.now(), data: { loadMs: Math.round(loadMs) } });
  },
  records: () => [...buffer],
  clear() {
    buffer = [];
    flush();
  },
};

/* ---------------------------------------------------------------- global error hook */

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;
interface ErrorUtilsShape {
  getGlobalHandler(): GlobalErrorHandler;
  setGlobalHandler(h: GlobalErrorHandler): void;
}

let installed = false;
export function installCrashHandler() {
  if (installed) return;
  installed = true;
  const eu = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  if (!eu) return;
  const prev = eu.getGlobalHandler();
  eu.setGlobalHandler((error, isFatal) => {
    telemetry.error(error, { fatal: !!isFatal });
    prev(error, isFatal);
  });
}

/* ---------------------------------------------------------------- frame monitor */

/**
 * Samples JS frame intervals with requestAnimationFrame. A burst of long frames
 * (>50ms, i.e. at least 3 dropped frames at 60fps) is recorded against the current context.
 */
export function startFrameMonitor(): () => void {
  let last: number | null = null;
  let longFrames = 0;
  let worst = 0;
  let windowStart = Date.now();
  let raf = 0;
  let stopped = false;
  const tick = (t: number) => {
    if (stopped) return;
    if (last != null) {
      const dt = t - last;
      if (dt > 50 && dt < 2000) {
        longFrames++;
        worst = Math.max(worst, dt);
      }
    }
    last = t;
    const now = Date.now();
    if (now - windowStart > 5000) {
      if (longFrames >= 3) record({ kind: 'jank', name: context, at: now, data: { longFrames, worstMs: Math.round(worst) } });
      longFrames = 0;
      worst = 0;
      windowStart = now;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}
