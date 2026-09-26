import { router } from 'expo-router';
import { useEffect } from 'react';
import { create } from 'zustand';

/** In-memory parent unlock; auto-locks after 10 minutes and never persists across launches. */
const TTL = 10 * 60 * 1000;
let timer: ReturnType<typeof setTimeout> | null = null;

export const useParentSession = create<{ unlocked: boolean; unlock: () => void; lock: () => void }>((set) => ({
  unlocked: false,
  unlock: () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => set({ unlocked: false }), TTL);
    set({ unlocked: true });
  },
  lock: () => {
    if (timer) clearTimeout(timer);
    set({ unlocked: false });
  },
}));

export const isParentUnlocked = () => useParentSession.getState().unlocked;

/** Redirects to the PIN gate when the parent session is locked. Returns whether access is allowed. */
export function useRequireParent(): boolean {
  const ok = useParentSession((s) => s.unlocked);
  useEffect(() => {
    if (!ok) router.replace('/parent');
  }, [ok]);
  return ok;
}
