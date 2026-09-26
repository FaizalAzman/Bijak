import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { BookOpen, Home, ShoppingBag, Target, UserRound } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@/components/ui';
import { fx } from '@/lib/feedback';
import { useProgress } from '@/store/app';
import { colors } from '@/theme';

const ICONS = { home: Home, learn: BookOpen, quests: Target, shop: ShoppingBag, me: UserRound } as const;
const LABELS = { home: 'Home', learn: 'Learn', quests: 'Quests', shop: 'Shop', me: 'Me' } as const;

function Tab({ name, focused, onPress, badge }: { name: keyof typeof ICONS; focused: boolean; onPress: () => void; badge?: number }) {
  const Icon = ICONS[name];
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(focused ? -3 : 0, { damping: 12 }) }, { scale: withSpring(focused ? 1.05 : 1, { damping: 12 }) }],
  }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={LABELS[name]}
      onPress={() => {
        fx.tap();
        onPress();
      }}
      style={{ flex: 1, alignItems: 'center' }}
    >
      <Animated.View
        style={[
          {
            alignItems: 'center',
            gap: 2,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 16,
            backgroundColor: focused ? colors.lime : 'transparent',
            borderWidth: 2,
            borderColor: focused ? colors.ink : 'transparent',
          },
          style,
        ]}
      >
        <Icon size={22} color={colors.ink} strokeWidth={focused ? 2.75 : 2.25} />
        <Txt variant="small" style={{ fontSize: 11, color: colors.ink, fontFamily: focused ? 'PlusJakartaSans_800ExtraBold' : 'PlusJakartaSans_600SemiBold' }}>
          {LABELS[name]}
        </Txt>
      </Animated.View>
      {!!badge && (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: '18%',
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            paddingHorizontal: 4,
            backgroundColor: colors.tangerine,
            borderWidth: 2,
            borderColor: colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt style={{ fontSize: 10, color: colors.paper, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{badge}</Txt>
        </View>
      )}
    </Pressable>
  );
}

export const TAB_BAR_SPACE = 96;

/** Floating chunky tab bar. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const progress = useProgress();
  const claimable = progress.quests.list.filter((q) => q.progress >= q.target && !q.claimed).length;
  return (
    <View
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, 12), paddingHorizontal: 14, alignItems: 'center' }}
      pointerEvents="box-none"
    >
      <View style={{ width: '100%', maxWidth: 520 }}>
        <View style={{ position: 'absolute', left: 4, top: 4, right: -4, bottom: -4, borderRadius: 24, backgroundColor: colors.ink }} />
        <View style={{ flexDirection: 'row', backgroundColor: colors.paper, borderRadius: 24, borderWidth: 2, borderColor: colors.ink, paddingVertical: 8, paddingHorizontal: 4 }}>
          {state.routes.map((route, i) => {
            const name = route.name as keyof typeof ICONS;
            if (!ICONS[name]) return null;
            const focused = state.index === i;
            return (
              <Tab
                key={route.key}
                name={name}
                focused={focused}
                badge={name === 'quests' ? claimable : undefined}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}
