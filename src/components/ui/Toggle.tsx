import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { fx } from '@/lib/feedback';
import { colors } from '@/theme';
import { Txt } from './Txt';

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: withSpring(value ? 22 : 0, { damping: 14 }) }] }));
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => {
        fx.tap();
        onChange(!value);
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
    >
      <View style={{ flex: 1 }}>
        <Txt variant="subtitle">{label}</Txt>
        {hint ? <Txt variant="small">{hint}</Txt> : null}
      </View>
      <View style={{ width: 54, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.ink, backgroundColor: value ? colors.lime : colors.sand, padding: 2 }}>
        <Animated.View style={[{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink }, knob]} />
      </View>
    </Pressable>
  );
}
