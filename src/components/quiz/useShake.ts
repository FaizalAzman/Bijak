import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

/** Short, small horizontal "nope" shake for a wrong answer (~200 ms). */
export function useShake() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = () => {
    x.set(withSequence(withTiming(-6, { duration: 50 }), withTiming(6, { duration: 50 }), withTiming(-3, { duration: 50 }), withTiming(0, { duration: 50 })));
  };
  return { style, shake };
}
