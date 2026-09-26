/** Web fallback for the local-first store (used for browser previews). */
import type { KV } from './storage';

const memory = new Map<string, string>();

function ls(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export const kv: KV = {
  getItem: (key) => {
    try {
      return ls()?.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem: (key, value) => {
    memory.set(key, value);
    try {
      ls()?.setItem(key, value);
    } catch {
      /* private mode — memory only */
    }
  },
  removeItem: (key) => {
    memory.delete(key);
    try {
      ls()?.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
