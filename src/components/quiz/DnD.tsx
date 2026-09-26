/**
 * Module 12 — Drag-and-drop primitives (react-native-gesture-handler + reanimated).
 * A `Draggable` can be flung onto any registered drop zone; zones are measured in
 * window coordinates at drop time so scrolling / layout changes never go stale.
 */
import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptic } from '@/lib/feedback';
import { DURATION, EASE_OUT } from '@/theme/motion';

type Rect = { x: number; y: number; w: number; h: number };
interface Zones {
  register: (id: string, view: View | null) => void;
  hitTest: (x: number, y: number) => Promise<string | null>;
}

const ZoneCtx = createContext<Zones | null>(null);

export function DropZones({ children }: { children: ReactNode }) {
  const views = useRef(new Map<string, View>());
  const register = useCallback((id: string, view: View | null) => {
    if (view) views.current.set(id, view);
    else views.current.delete(id);
  }, []);
  const hitTest = useCallback(async (x: number, y: number) => {
    const rects = await Promise.all(
      [...views.current.entries()].map(([id, v]) => new Promise<[string, Rect]>((res) => v.measureInWindow((rx, ry, w, h) => res([id, { x: rx, y: ry, w, h }])))),
    );
    // Generous 12px slop so small fingers still hit the target.
    const hit = rects.find(([, r]) => x >= r.x - 12 && x <= r.x + r.w + 12 && y >= r.y - 12 && y <= r.y + r.h + 12);
    return hit ? hit[0] : null;
  }, []);
  return <ZoneCtx.Provider value={{ register, hitTest }}>{children}</ZoneCtx.Provider>;
}

export function DropZone({ id, children, style }: { id: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const zones = useContext(ZoneCtx);
  return (
    <View ref={(v) => zones?.register(id, v)} collapsable={false} style={style}>
      {children}
    </View>
  );
}

export function Draggable({
  children,
  onDrop,
  onTap,
  disabled,
  style,
}: {
  children: ReactNode;
  /** Return true if the drop was accepted (the item will be re-parented by the caller). */
  onDrop: (zoneId: string | null) => boolean | Promise<boolean>;
  onTap?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const zones = useContext(ZoneCtx);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const lifted = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(6)
    .runOnJS(true)
    .onStart(() => {
      lifted.value = 1;
      scale.value = withTiming(1.04, { duration: DURATION.fast });
      haptic('select');
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd(async (e) => {
      const zone = zones ? await zones.hitTest(e.absoluteX, e.absoluteY) : null;
      const accepted = await onDrop(zone);
      scale.value = withTiming(1, { duration: DURATION.fast });
      if (accepted) {
        tx.value = 0;
        ty.value = 0;
      } else {
        tx.value = withTiming(0, { duration: DURATION.base, easing: EASE_OUT });
        ty.value = withTiming(0, { duration: DURATION.base, easing: EASE_OUT });
      }
      lifted.value = 0;
    });

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .runOnJS(true)
    .onEnd(() => onTap?.());

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    zIndex: lifted.value ? 100 : 1,
    shadowOpacity: lifted.value ? 0.25 : 0,
  }));

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <Animated.View style={[style, aStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}
