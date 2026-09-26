/** Module 10 — Multiple Choice engine: text / emoji options, instant validation, shake on wrong. */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { PressChunky, Txt } from '@/components/ui';
import { fx } from '@/lib/feedback';
import { colors } from '@/theme';
import type { QuestionProps } from './types';
import { useShake } from './useShake';

function OptionTile({
  label,
  emoji,
  state,
  onPress,
  disabled,
  index,
  compact,
}: {
  label?: string;
  emoji?: string;
  state: 'idle' | 'right' | 'wrong' | 'reveal';
  onPress: () => void;
  disabled: boolean;
  index: number;
  compact: boolean;
}) {
  const { style: shakeStyle, shake } = useShake();
  useEffect(() => {
    if (state === 'wrong') shake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const bg = state === 'right' || state === 'reveal' ? colors.mint : state === 'wrong' ? colors.berry : colors.paper;
  const fg = state === 'wrong' ? colors.paper : colors.ink;
  return (
    <View style={{ flexBasis: compact ? '46%' : '100%', flexGrow: 1 }}>
      <Animated.View style={shakeStyle}>
        <PressChunky
          sound={false}
          disabled={disabled && state === 'idle'}
          onPress={onPress}
          bg={bg}
          accessibilityLabel={label ?? emoji}
          innerStyle={{
            paddingVertical: compact ? 18 : 15,
            paddingHorizontal: 16,
            flexDirection: compact ? 'column' : 'row',
            alignItems: 'center',
            gap: compact ? 4 : 12,
            minHeight: compact ? 88 : undefined,
            justifyContent: 'center',
          }}
        >
          {!compact && (
            <View style={{ width: 30, height: 30, borderRadius: 9, borderWidth: 2, borderColor: fg, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: fg }}>{String.fromCharCode(65 + index)}</Txt>
            </View>
          )}
          {emoji ? <Txt style={{ fontSize: compact ? 34 : 26 }}>{emoji}</Txt> : null}
          {label ? (
            <Txt variant="title" style={{ color: fg, flex: compact ? undefined : 1, textAlign: compact ? 'center' : 'left', fontSize: compact ? 20 : 17 }}>
              {label}
            </Txt>
          ) : null}
        </PressChunky>
      </Animated.View>
    </View>
  );
}

export function MCQ({ q, onAnswer, locked }: QuestionProps<'mcq'>) {
  const [picked, setPicked] = useState<string | null>(null);
  const compact = q.options.every((o) => (o.text?.length ?? 0) <= 12);
  const pick = (id: string) => {
    if (picked || locked) return;
    setPicked(id);
    const ok = id === q.answer;
    if (ok) fx.correct();
    else fx.wrong();
    onAnswer(ok);
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {q.options.map((o, i) => {
        const state = !picked ? 'idle' : o.id === picked ? (o.id === q.answer ? 'right' : 'wrong') : o.id === q.answer ? 'reveal' : 'idle';
        return <OptionTile key={o.id} index={i} label={o.text} emoji={o.emoji} state={state} disabled={!!picked || locked} onPress={() => pick(o.id)} compact={compact} />;
      })}
    </View>
  );
}
