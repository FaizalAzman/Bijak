import type { ReactNode } from 'react';
import { View } from 'react-native';
import { colors } from '@/theme';
import { Txt } from './Txt';

/** Small bordered stat pill: 🔥 3 · 🪙 120 · ⭐ Lv 4 */
export function Pill({ icon, value, bg = colors.paper, fg = colors.ink, testID }: { icon: ReactNode; value: string | number; bg?: string; fg?: string; testID?: string }) {
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: colors.ink,
        backgroundColor: bg,
      }}
    >
      {typeof icon === 'string' ? <Txt style={{ fontSize: 15 }}>{icon}</Txt> : icon}
      <Txt variant="number" style={{ fontSize: 16, color: fg }}>
        {value}
      </Txt>
    </View>
  );
}

/** Status tag like the green "Active" badge. */
export function Tag({ label, bg = colors.mint, fg = colors.ink }: { label: string; bg?: string; fg?: string }) {
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 2, borderColor: colors.ink, backgroundColor: bg }}>
      <Txt variant="small" style={{ color: fg, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12 }}>
        {label}
      </Txt>
    </View>
  );
}

/** Emoji inside a round bordered badge (like the "AR" initials). */
export function EmojiBadge({ emoji, size = 44, bg = colors.lime }: { emoji: string; size?: number; bg?: string }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.ink, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <Txt style={{ fontSize: size * 0.48, lineHeight: size * 0.62 }}>{emoji}</Txt>
    </View>
  );
}

export function SectionLabel({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between mt-6 mb-3">
      <Txt variant="label">{children}</Txt>
      {right}
    </View>
  );
}
