import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { fx } from '@/lib/feedback';
import { colors, SHADOW_OFFSET } from '@/theme';

interface ChunkyProps {
  children: ReactNode;
  bg?: string;
  radius?: number;
  /** Hard drop-shadow depth; 0 disables it. */
  depth?: number;
  shadowColor?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  className?: string;
}

/** The signature "neo-brutalist" card: thick ink border + solid offset shadow. */
export function Chunky({
  children,
  bg = colors.paper,
  radius = 18,
  depth = SHADOW_OFFSET,
  shadowColor = colors.ink,
  borderColor = colors.ink,
  style,
  innerStyle,
  className,
}: ChunkyProps) {
  return (
    <View style={[{ paddingRight: depth, paddingBottom: depth }, style]} className={className}>
      {depth > 0 && (
        <View pointerEvents="none" style={{ position: 'absolute', left: depth, top: depth, right: 0, bottom: 0, borderRadius: radius, backgroundColor: shadowColor }} />
      )}
      <View style={[{ backgroundColor: bg, borderRadius: radius, borderWidth: 2, borderColor }, innerStyle]}>{children}</View>
    </View>
  );
}

interface PressChunkyProps extends ChunkyProps {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  sound?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

/** Chunky card that physically "presses down" into its shadow. */
export function PressChunky({
  children,
  onPress,
  onLongPress,
  disabled,
  sound = true,
  bg = colors.paper,
  radius = 18,
  depth = SHADOW_OFFSET,
  shadowColor = colors.ink,
  borderColor = colors.ink,
  style,
  innerStyle,
  className,
  accessibilityLabel,
  testID,
}: PressChunkyProps) {
  const pressed = useSharedValue(0);
  const face = useAnimatedStyle(() => ({
    transform: [{ translateX: pressed.value * depth }, { translateY: pressed.value * depth }],
  }));
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 70 });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 90 });
      }}
      onPress={() => {
        if (sound) fx.tap();
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={[{ paddingRight: depth, paddingBottom: depth, opacity: disabled ? 0.6 : 1 }, style]}
      className={className}
    >
      {depth > 0 && (
        <View pointerEvents="none" style={{ position: 'absolute', left: depth, top: depth, right: 0, bottom: 0, borderRadius: radius, backgroundColor: shadowColor }} />
      )}
      <Animated.View style={[{ backgroundColor: bg, borderRadius: radius, borderWidth: 2, borderColor }, innerStyle, face]}>{children}</Animated.View>
    </Pressable>
  );
}
