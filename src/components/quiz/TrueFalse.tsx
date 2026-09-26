import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { PressChunky, Txt } from '@/components/ui';
import { fx } from '@/lib/feedback';
import { colors } from '@/theme';
import { LABELS, type QuestionProps } from './types';
import { useShake } from './useShake';

export function TrueFalse({ q, onAnswer, locked }: QuestionProps<'trueFalse'>) {
  const [picked, setPicked] = useState<boolean | null>(null);
  const { style, shake } = useShake();
  const L = LABELS[q.lang];
  const pick = (v: boolean) => {
    if (picked != null || locked) return;
    setPicked(v);
    const ok = v === q.answer;
    if (ok) fx.correct();
    else {
      fx.wrong();
      shake();
    }
    onAnswer(ok);
  };
  const tile = (v: boolean) => {
    const chosen = picked === v;
    const bg = picked == null ? (v ? colors['mint-soft'] : colors['berry-soft']) : v === q.answer ? colors.mint : chosen ? colors.berry : colors.paper;
    const Icon = v ? Check : X;
    return (
      <View style={{ flex: 1 }}>
        <PressChunky
          sound={false}
          onPress={() => pick(v)}
          disabled={picked != null || locked}
          bg={bg}
          accessibilityLabel={v ? L.true : L.false}
          innerStyle={{ height: 150, alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: colors.paper,
              borderWidth: 2,
              borderColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={32} color={colors.ink} strokeWidth={3.5} />
          </View>
          <Txt variant="display">{v ? L.true : L.false}</Txt>
        </PressChunky>
      </View>
    );
  };
  return (
    <Animated.View style={[{ flexDirection: 'row', gap: 14 }, style]}>
      {tile(true)}
      {tile(false)}
    </Animated.View>
  );
}
