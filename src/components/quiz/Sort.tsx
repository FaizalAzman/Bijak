/** Module 12 — Sorting into buckets (drag, or tap item then tap bucket). Instant per-drop validation. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Txt } from '@/components/ui';
import { fx } from '@/lib/feedback';
import { shuffle } from '@/lib/random';
import { colors } from '@/theme';
import { Draggable, DropZone, DropZones } from './DnD';
import type { QuestionProps } from './types';
import { useShake } from './useShake';
import { WordChip } from './WordChip';

const BUCKET_BG = [colors['sky-soft'], colors['tangerine-soft'], colors['grape-soft']];

function Bucket({
  b,
  i,
  items,
  onPress,
  highlight,
  shakeKey,
}: {
  b: { id: string; label: string; emoji?: string };
  i: number;
  items: string[];
  onPress: () => void;
  highlight: boolean;
  shakeKey: number;
}) {
  const { style, shake } = useShake();
  useEffect(() => {
    if (shakeKey) shake();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shakeKey]);
  return (
    <Animated.View style={[{ flex: 1 }, style]}>
      <DropZone id={b.id} style={{ flex: 1 }}>
        <Pressable
          onPress={onPress}
          accessibilityLabel={`Bucket ${b.label}`}
          style={{
            flex: 1,
            minHeight: 170,
            borderRadius: 18,
            borderWidth: 2.5,
            borderStyle: highlight ? 'solid' : 'dashed',
            borderColor: colors.ink,
            backgroundColor: highlight ? colors['sun-soft'] : BUCKET_BG[i % 3],
            padding: 10,
            gap: 8,
          }}
        >
          <View style={{ alignItems: 'center', gap: 2 }}>
            {b.emoji ? <Txt style={{ fontSize: 28 }}>{b.emoji}</Txt> : null}
            <Txt variant="subtitle" style={{ textAlign: 'center' }}>
              {b.label}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {items.map((t) => (
              <View key={t} style={{ backgroundColor: colors.paper, borderRadius: 10, borderWidth: 1.5, borderColor: colors.ink, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Txt variant="small" style={{ color: colors.ink }}>
                  {t}
                </Txt>
              </View>
            ))}
          </View>
        </Pressable>
      </DropZone>
    </Animated.View>
  );
}

export function Sort({ q, onAnswer, locked }: QuestionProps<'sort'>) {
  const pool0 = useMemo(() => shuffle(q.items.map((it) => it.text)), [q]);
  const bucketOf = useMemo(() => new Map(q.items.map((it) => [it.text, it.bucket])), [q]);
  const [placed, setPlaced] = useState<Record<string, string[]>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [shakes, setShakes] = useState<Record<string, number>>({});
  const mistakes = useRef(0);
  const done = new Set(Object.values(placed).flat());
  const pool = pool0.filter((t) => !done.has(t));

  const place = (text: string, bucket: string | null): boolean => {
    if (!bucket || locked) return false;
    if (bucketOf.get(text) !== bucket) {
      mistakes.current++;
      fx.wrong();
      setShakes((s) => ({ ...s, [bucket]: (s[bucket] ?? 0) + 1 }));
      return false;
    }
    fx.drop();
    setSelected(null);
    const next = { ...placed, [bucket]: [...(placed[bucket] ?? []), text] };
    setPlaced(next);
    if (Object.values(next).flat().length === q.items.length) {
      const ok = mistakes.current === 0;
      setTimeout(() => {
        if (ok) fx.correct();
        onAnswer(ok);
      }, 300);
    }
    return true;
  };

  return (
    <DropZones>
      <View style={{ gap: 18 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', minHeight: 50, zIndex: 10 }}>
          {pool.map((t) => (
            <Draggable key={t} disabled={locked} onDrop={(zone) => place(t, zone)} onTap={() => (fx.tap(), setSelected(selected === t ? null : t))}>
              <WordChip text={t} bg={selected === t ? colors.sun : colors.paper} />
            </Draggable>
          ))}
          {pool.length === 0 && (
            <Txt variant="subtitle" style={{ color: colors.muted }}>
              All sorted! ✨
            </Txt>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {q.buckets.map((b, i) => (
            <Bucket key={b.id} b={b} i={i} items={placed[b.id] ?? []} highlight={!!selected} shakeKey={shakes[b.id] ?? 0} onPress={() => selected && place(selected, b.id)} />
          ))}
        </View>
      </View>
    </DropZones>
  );
}
