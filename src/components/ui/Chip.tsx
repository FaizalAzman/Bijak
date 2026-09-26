import { Pressable } from 'react-native';
import { fx } from '@/lib/feedback';
import { colors } from '@/theme';
import { Txt } from './Txt';

/** Pill filter chip, as in "Current 44 · Active 42". */
export function Chip({ label, count, selected, onPress, color }: { label: string; count?: number | string; selected?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        fx.tap();
        onPress?.();
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: colors.ink,
        backgroundColor: selected ? colors.ink : (color ?? colors.paper),
        maxWidth: '100%',
      }}
    >
      {/* Long labels (e.g. topic names) wrap inside the chip instead of running off a small screen. */}
      <Txt variant="subtitle" style={{ fontSize: 14, color: selected ? colors.paper : colors.ink, flexShrink: 1 }}>
        {label}
      </Txt>
      {count != null && (
        <Txt variant="small" style={{ color: selected ? colors.lime : colors.muted }}>
          {count}
        </Txt>
      )}
    </Pressable>
  );
}
