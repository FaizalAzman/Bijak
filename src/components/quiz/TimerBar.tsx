/** Module 14 — depleting time-attack bar (UI-thread animation, turns red in the last 10s). */
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '@/theme';

export function TimerBar({ seconds, running }: { seconds: number; running: boolean }) {
  const v = useSharedValue(1);
  useEffect(() => {
    if (running) v.value = withTiming(0, { duration: seconds * 1000, easing: Easing.linear });
  }, [running, seconds, v]);
  const style = useAnimatedStyle(() => ({
    width: `${v.value * 100}%`,
    backgroundColor: interpolateColor(v.value, [0, 10 / seconds, 0.5, 1], [colors.berry, colors.tangerine, colors.sun, colors.mint]),
  }));
  return (
    <View style={{ height: 18, borderRadius: 10, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.paper, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRightWidth: 2, borderColor: colors.ink }, style]} />
    </View>
  );
}
