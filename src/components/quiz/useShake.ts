import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

/** Horizontal "nope" shake used for wrong answers. */
export function useShake() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = () => {
    x.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 50 }),
      ),
    );
  };
  return { style, shake };
}
