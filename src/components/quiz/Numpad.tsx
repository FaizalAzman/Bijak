import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Button, Keypad, Txt } from '@/components/ui';
import { fx } from '@/lib/feedback';
import { groupDigits } from '@/lib/format';
import { colors } from '@/theme';
import { LABELS, numericEqual, type QuestionProps } from './types';
import { useShake } from './useShake';

/** Numeric answers with a big on-screen keypad (no system keyboard). */
export function Numpad({ q, onAnswer, locked }: QuestionProps<'numpad'>) {
  const [value, setValue] = useState('');
  const [state, setState] = useState<'idle' | 'right' | 'wrong'>('idle');
  const { style, shake } = useShake();
  const decimal = q.answer.includes('.');
  const onKey = (k: string) => {
    if (locked || state !== 'idle') return;
    fx.tap();
    if (k === 'del') setValue((v) => v.slice(0, -1));
    else if (k === '.') setValue((v) => (v.includes('.') ? v : `${v || '0'}.`));
    else setValue((v) => (v.length >= 9 ? v : v === '0' ? k : v + k));
  };
  const check = () => {
    const ok = numericEqual(value, q.answer);
    setState(ok ? 'right' : 'wrong');
    if (ok) fx.correct();
    else {
      fx.wrong();
      shake();
    }
    onAnswer(ok);
  };
  const bg = state === 'right' ? colors.mint : state === 'wrong' ? colors['berry-soft'] : colors.paper;
  const shown = value ? (value.includes('.') ? value : groupDigits(value)) : '?';
  return (
    <View style={{ gap: 14 }}>
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: bg,
            borderWidth: 2.5,
            borderColor: colors.ink,
            borderRadius: 18,
            paddingVertical: 10,
            minHeight: 72,
          },
          style,
        ]}
      >
        {q.unit === 'RM' && (
          <Txt variant="display" style={{ color: colors.muted }}>
            RM
          </Txt>
        )}
        <Txt variant="hero" style={{ fontSize: 40, lineHeight: 48, color: value ? colors.ink : colors.line }}>
          {shown}
        </Txt>
        {q.unit && q.unit !== 'RM' ? (
          <Txt variant="display" style={{ color: colors.muted }}>
            {q.unit}
          </Txt>
        ) : null}
      </Animated.View>
      <Keypad onKey={onKey} extraKey={decimal ? '.' : undefined} disabled={locked || state !== 'idle'} compact />
      {state === 'idle' && <Button label={LABELS[q.lang].check} tone="ink" size="lg" full disabled={!value || locked} onPress={check} testID="check" />}
    </View>
  );
}
