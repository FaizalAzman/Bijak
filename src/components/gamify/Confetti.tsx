import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { seeded } from '@/lib/random';
import { colors } from '@/theme';

const PALETTE = [colors.lime, colors.grape, colors.tangerine, colors.sky, colors.sun, colors.berry, colors.mint];

function Piece({
  x,
  delay,
  duration,
  color,
  w,
  h,
  drift,
  spin,
  height,
}: {
  x: number;
  delay: number;
  duration: number;
  color: string;
  w: number;
  h: number;
  drift: number;
  spin: number;
  height: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) })));
  }, [t, delay, duration]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
    transform: [{ translateX: x + drift * t.value }, { translateY: -40 + t.value * (height + 60) }, { rotate: `${spin * t.value}deg` }],
  }));
  return (
    <Animated.View
      style={[{ position: 'absolute', top: 0, left: 0, width: w, height: h, backgroundColor: color, borderRadius: 2, borderWidth: 1.5, borderColor: colors.ink }, style]}
    />
  );
}

/** Lightweight physics-ish confetti burst (all animation on the UI thread). */
export const Confetti = memo(function Confetti({ count = 40 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => {
    const rnd = seeded(count * 7919 + Math.round(width));
    return Array.from({ length: count }, (_, i) => ({
      x: rnd() * width,
      delay: rnd() * 400,
      duration: 2200 + rnd() * 900,
      color: PALETTE[i % PALETTE.length],
      w: 8 + rnd() * 6,
      h: 12 + rnd() * 8,
      drift: (rnd() - 0.5) * 160,
      spin: (rnd() - 0.5) * 900,
    }));
  }, [count, width]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Piece key={i} {...p} height={height} />
      ))}
    </View>
  );
});
