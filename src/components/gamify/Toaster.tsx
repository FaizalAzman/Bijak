import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeOutUp, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { Chunky, Txt } from '@/components/ui';
import { colors } from '@/theme';

interface Toast {
  id: number;
  emoji: string;
  title: string;
  subtitle?: string;
  bg?: string;
}

interface ToastState {
  queue: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  shift: () => void;
}

let nextId = 1;
const useToasts = create<ToastState>((set) => ({
  queue: [],
  push: (t) => set((s) => ({ queue: [...s.queue, { ...t, id: nextId++ }] })),
  shift: () => set((s) => ({ queue: s.queue.slice(1) })),
}));

export const toast = (t: Omit<Toast, 'id'>) => useToasts.getState().push(t);

/** Global celebratory toasts (badges unlocked, quests complete, content updated). */
export function Toaster() {
  const current = useToasts((s) => s.queue[0]);
  const shift = useToasts((s) => s.shift);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(shift, 2600);
    return () => clearTimeout(t);
  }, [current, shift]);
  if (!current) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, alignItems: 'center' }}>
      <Animated.View key={current.id} entering={SlideInUp.springify().damping(14)} exiting={FadeOutUp} style={{ width: '100%', maxWidth: 460 }}>
        <Chunky bg={current.bg ?? colors.lime} innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
          <Txt style={{ fontSize: 30 }}>{current.emoji}</Txt>
          <View style={{ flex: 1 }}>
            <Txt variant="title">{current.title}</Txt>
            {current.subtitle ? (
              <Txt variant="small" style={{ color: colors.ink }}>
                {current.subtitle}
              </Txt>
            ) : null}
          </View>
        </Chunky>
      </Animated.View>
    </View>
  );
}
