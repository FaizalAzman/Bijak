import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Txt } from '@/components/ui';
import { colors } from '@/theme';
import { Kancil, type KancilMood } from './Kancil';

/** Kancil with a speech bubble. Re-animates whenever the message changes. */
export function MascotSays({ text, mood = 'idle', size = 96, bubbleBg = colors.paper }: { text: string; mood?: KancilMood; size?: number; bubbleBg?: string }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withSequence(withTiming(0.92, { duration: 80 }), withSpring(1, { damping: 8, stiffness: 300 }));
  }, [text, s]);
  const bubble = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
      <Kancil mood={mood} size={size} />
      <Animated.View style={[{ flex: 1, marginBottom: size * 0.35 }, bubble]}>
        <View style={{ backgroundColor: bubbleBg, borderWidth: 2, borderColor: colors.ink, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11 }}>
          <Txt variant="subtitle" style={{ fontSize: 15, lineHeight: 21 }}>
            {text}
          </Txt>
        </View>
        {/* bubble tail */}
        <View
          style={{
            position: 'absolute',
            left: -9,
            bottom: 14,
            width: 16,
            height: 16,
            backgroundColor: bubbleBg,
            borderLeftWidth: 2,
            borderBottomWidth: 2,
            borderColor: colors.ink,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}
