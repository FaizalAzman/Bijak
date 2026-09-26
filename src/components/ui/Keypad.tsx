import { Delete } from 'lucide-react-native';
import { View } from 'react-native';
import { colors } from '@/theme';
import { PressChunky } from './Chunky';
import { useFrame } from './Frame';
import { Txt } from './Txt';

/** Kid-friendly on-screen keypad (no system keyboard). Used for PINs and numeric answers. */
export function Keypad({ onKey, extraKey, disabled, compact }: { onKey: (k: string) => void; extraKey?: string; disabled?: boolean; compact?: boolean }) {
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [extraKey ?? '', '0', 'del'],
  ];
  const { small, isTablet } = useFrame();
  const h = isTablet ? 64 : small ? (compact ? 44 : 52) : compact ? 50 : 60;
  return (
    <View style={{ gap: compact ? 8 : 10, width: '100%', maxWidth: 440, alignSelf: 'center' }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: compact ? 8 : 10 }}>
          {row.map((k, j) =>
            k === '' ? (
              <View key={j} style={{ flex: 1 }} />
            ) : (
              <PressChunky
                key={j}
                disabled={disabled}
                accessibilityLabel={k === 'del' ? 'Delete' : k}
                onPress={() => onKey(k)}
                style={{ flex: 1 }}
                depth={3}
                radius={14}
                bg={k === 'del' ? colors['berry-soft'] : colors.paper}
                innerStyle={{ height: h, alignItems: 'center', justifyContent: 'center' }}
              >
                {k === 'del' ? <Delete size={24} color={colors.ink} strokeWidth={2.5} /> : <Txt variant="display">{k}</Txt>}
              </PressChunky>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

export function PinDots({ length, filled, error }: { length: number; filled: number; error?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 14, justifyContent: 'center' }}>
      {Array.from({ length }, (_, i) => (
        <View
          key={i}
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2.5,
            borderColor: colors.ink,
            backgroundColor: error ? colors.berry : i < filled ? colors.ink : colors.paper,
          }}
        />
      ))}
    </View>
  );
}
