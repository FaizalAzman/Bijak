/** Module 12 — Sentence / sequence builder. Tap or drag tiles into the answer line, then Check. */
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Button, Txt } from '@/components/ui';
import { fx } from '@/lib/feedback';
import { shuffleNotIdentity } from '@/lib/random';
import { colors } from '@/theme';
import { Draggable, DropZone, DropZones } from './DnD';
import { LABELS, type QuestionProps } from './types';
import { useShake } from './useShake';
import { WordChip } from './WordChip';

interface Tile {
  id: number;
  text: string;
}

export function Order({ q, onAnswer, locked }: QuestionProps<'order'>) {
  const tiles = useMemo<Tile[]>(() => shuffleNotIdentity([...q.tokens, ...q.distractors]).map((text, id) => ({ id, text })), [q]);
  const [answer, setAnswer] = useState<Tile[]>([]);
  const [state, setState] = useState<'idle' | 'right' | 'wrong'>('idle');
  const { style, shake } = useShake();
  const used = new Set(answer.map((t) => t.id));
  const frozen = locked || state !== 'idle';

  const add = (t: Tile) => {
    if (frozen || used.has(t.id)) return false;
    fx.drop();
    setAnswer((a) => [...a, t]);
    return true;
  };
  const remove = (t: Tile) => {
    if (frozen) return;
    fx.tap();
    setAnswer((a) => a.filter((x) => x.id !== t.id));
  };
  const check = () => {
    const ok = answer.length === q.tokens.length && answer.every((t, i) => t.text === q.tokens[i]);
    setState(ok ? 'right' : 'wrong');
    if (ok) fx.correct();
    else {
      fx.wrong();
      shake();
    }
    onAnswer(ok);
  };

  return (
    <DropZones>
      <View style={{ gap: 20 }}>
        <Animated.View style={style}>
          <DropZone id="answer">
            <View
              style={{
                minHeight: 120,
                borderRadius: 18,
                borderWidth: 2.5,
                borderColor: colors.ink,
                backgroundColor: state === 'right' ? colors['mint-soft'] : state === 'wrong' ? colors['berry-soft'] : colors.paper,
                padding: 12,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 10,
                alignContent: 'flex-start',
              }}
            >
              {answer.length === 0 && (
                <Txt variant="small" style={{ alignSelf: 'center', width: '100%', textAlign: 'center', marginTop: 34 }}>
                  {LABELS[q.lang].tapOrDrag} ↓
                </Txt>
              )}
              {answer.map((t) => (
                <Pressable key={t.id} onPress={() => remove(t)} accessibilityRole="button" accessibilityLabel={`Remove ${t.text}`}>
                  <WordChip text={t.text} bg={colors.lime} />
                </Pressable>
              ))}
            </View>
          </DropZone>
        </Animated.View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', zIndex: 10 }}>
          {tiles.map((t) => (
            <Draggable key={t.id} disabled={frozen || used.has(t.id)} onDrop={(zone) => (zone === 'answer' ? add(t) : false)} onTap={() => add(t)}>
              <WordChip text={t.text} faded={used.has(t.id)} />
            </Draggable>
          ))}
        </View>
        {state === 'idle' && <Button label={LABELS[q.lang].check} size="lg" full disabled={answer.length === 0 || locked} onPress={check} testID="check" />}
      </View>
    </DropZones>
  );
}
