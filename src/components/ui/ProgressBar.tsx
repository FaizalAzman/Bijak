import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '@/theme';

/**
 * Renders at its current value immediately (no fill-from-zero when a screen opens) and
 * only animates when the value changes while visible, e.g. moving to the next question.
 */
export function ProgressBar({ value, color = colors.lime, height = 14, track = colors.paper }: { value: number; color?: string; height?: number; track?: string }) {
  const target = Math.max(0, Math.min(1, value));
  const v = useSharedValue(target);
  useEffect(() => {
    v.set(withTiming(target, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, [target, v]);
  const fill = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height, borderWidth: 2, borderColor: colors.ink, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: color, borderRightWidth: target > 0 && target < 1 ? 2 : 0, borderColor: colors.ink }, fill]}>
        <View style={{ position: 'absolute', left: 6, right: 6, top: 2, height: Math.max(2, height / 5), borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' }} />
      </Animated.View>
    </View>
  );
}
