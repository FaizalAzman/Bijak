/** Module 13 — Fill-in-the-blanks with a kid-friendly word bank (tap or drag, no keyboard). */
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Button, Txt } from '@/components/ui';
import { BLANK } from '@/features/content/validate';
import { fx } from '@/lib/feedback';
import { shuffle } from '@/lib/random';
import { colors } from '@/theme';
import { Draggable, DropZone, DropZones } from './DnD';
import { LABELS, type QuestionProps } from './types';
import { useShake } from './useShake';
import { WordChip } from './WordChip';

export function FillBlank({ q, onAnswer, locked }: QuestionProps<'fillBlank'>) {
  const bank = useMemo(() => shuffle(q.bank).map((text, id) => ({ id, text })), [q]);
  const parts = useMemo(() => q.text.split(BLANK), [q]);
  const [filled, setFilled] = useState<(number | null)[]>(() => q.blanks.map(() => null));
  const [focus, setFocus] = useState(0);
  const [state, setState] = useState<'idle' | 'right' | 'wrong'>('idle');
  const { style, shake } = useShake();
  const frozen = locked || state !== 'idle';

  const fill = (tileId: number, blank?: number) => {
    if (frozen || filled.includes(tileId)) return false;
    const target = blank ?? (filled[focus] == null ? focus : filled.findIndex((f) => f == null));
    if (target < 0) return false;
    fx.drop();
    const next = [...filled];
    next[target] = tileId;
    setFilled(next);
    const nextEmpty = next.findIndex((f) => f == null);
    setFocus(nextEmpty < 0 ? target : nextEmpty);
    return true;
  };
  const clear = (i: number) => {
    if (frozen) return;
    fx.tap();
    const next = [...filled];
    next[i] = null;
    setFilled(next);
    setFocus(i);
  };
  const check = () => {
    const ok = filled.every((f, i) => f != null && bank[f].text === q.blanks[i]);
    setState(ok ? 'right' : 'wrong');
    if (ok) fx.correct();
    else {
      fx.wrong();
      shake();
    }
    onAnswer(ok);
  };

  // Render the sentence as a wrap of words and blank slots.
  const pieces: ({ word: string } | { blank: number })[] = [];
  parts.forEach((p, i) => {
    p.split(/\s+/)
      .filter(Boolean)
      .forEach((w) => pieces.push({ word: w }));
    if (i < parts.length - 1) pieces.push({ blank: i });
  });

  return (
    <DropZones>
      <View style={{ gap: 22 }}>
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 8,
              padding: 16,
              borderRadius: 18,
              borderWidth: 2.5,
              borderColor: colors.ink,
              backgroundColor: state === 'right' ? colors['mint-soft'] : state === 'wrong' ? colors['berry-soft'] : colors.paper,
            },
            style,
          ]}
        >
          {pieces.map((p, k) =>
            'word' in p ? (
              <Txt key={k} variant="title" style={{ fontSize: 20, lineHeight: 30 }}>
                {p.word}
              </Txt>
            ) : (
              <DropZone key={k} id={`blank-${p.blank}`}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${LABELS[q.lang].blank} ${p.blank + 1}`}
                  onPress={() => (filled[p.blank] != null ? clear(p.blank) : setFocus(p.blank))}
                  style={{
                    minWidth: 86,
                    minHeight: 42,
                    borderRadius: 12,
                    borderWidth: 2.5,
                    borderStyle: filled[p.blank] != null ? 'solid' : 'dashed',
                    borderColor: focus === p.blank && !frozen ? colors.grape : colors.ink,
                    backgroundColor: filled[p.blank] != null ? colors.lime : colors.sand,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 10,
                  }}
                >
                  {filled[p.blank] != null ? <Txt variant="title">{bank[filled[p.blank] as number].text}</Txt> : null}
                </Pressable>
              </DropZone>
            ),
          )}
        </Animated.View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', zIndex: 10 }}>
          {bank.map((t) => (
            <Draggable
              key={t.id}
              disabled={frozen || filled.includes(t.id)}
              onDrop={(zone) => (zone?.startsWith('blank-') ? fill(t.id, Number(zone.slice(6))) : false)}
              onTap={() => fill(t.id)}
            >
              <WordChip text={t.text} faded={filled.includes(t.id)} big />
            </Draggable>
          ))}
        </View>
        {state === 'idle' && <Button label={LABELS[q.lang].check} size="lg" full disabled={filled.some((f) => f == null) || locked} onPress={check} testID="check" />}
      </View>
    </DropZones>
  );
}
