/**
 * Module 11 — Gesture-based matching engine.
 * Drag a finger from an item on one side to its partner on the other to draw a
 * connecting line (tapping one then the other also works). Correct pairs lock in with
 * a coloured line; wrong attempts flash red and shake.
 */
import { useMemo, useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, G, Line } from 'react-native-svg';
import { Txt } from '@/components/ui';
import { fx, haptic } from '@/lib/feedback';
import { shuffle } from '@/lib/random';
import { colors } from '@/theme';
import type { QuestionProps } from './types';
import { useShake } from './useShake';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const PAIR_COLORS = [colors.lime, colors.sky, colors.sun, colors['grape-soft'], colors.tangerine];

type Side = 'L' | 'R';
type Rect = { x: number; y: number; w: number; h: number };

export function Match({ q, onAnswer, locked }: QuestionProps<'match'>) {
  const lefts = useMemo(() => shuffle(q.pairs.map((p) => p.left)), [q]);
  const rights = useMemo(() => shuffle(q.pairs.map((p) => p.right)), [q]);
  const partner = useMemo(() => new Map(q.pairs.map((p) => [p.left, p.right])), [q]);

  const [matched, setMatched] = useState<string[]>([]); // left values
  const [selected, setSelected] = useState<{ side: Side; value: string } | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const mistakes = useRef(0);
  const { style: shakeStyle, shake } = useShake();

  const [cols, setCols] = useState<Record<Side, Rect>>({ L: { x: 0, y: 0, w: 0, h: 0 }, R: { x: 0, y: 0, w: 0, h: 0 } });
  const [items, setItems] = useState<Record<string, Rect>>({});

  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const ex = useSharedValue(0);
  const ey = useSharedValue(0);
  const drawing = useSharedValue(0);
  const start = useRef<{ side: Side; value: string } | null>(null);

  const rectOf = (side: Side, value: string): Rect | undefined => {
    const r = items[`${side}:${value}`];
    const c = cols[side];
    return r ? { x: c.x + r.x, y: c.y + r.y, w: r.w, h: r.h } : undefined;
  };
  const anchor = (side: Side, value: string) => {
    const r = rectOf(side, value);
    if (!r) return { x: 0, y: 0 };
    return { x: side === 'L' ? r.x + r.w : r.x, y: r.y + r.h / 2 };
  };
  const hit = (x: number, y: number): { side: Side; value: string } | null => {
    for (const side of ['L', 'R'] as Side[]) {
      for (const value of side === 'L' ? lefts : rights) {
        const r = rectOf(side, value);
        if (r && x >= r.x - 6 && x <= r.x + r.w + 6 && y >= r.y - 6 && y <= r.y + r.h + 6) return { side, value };
      }
    }
    return null;
  };
  const isMatched = (side: Side, value: string) => (side === 'L' ? matched.includes(value) : matched.some((l) => partner.get(l) === value));

  const attempt = (a: { side: Side; value: string }, b: { side: Side; value: string }) => {
    if (a.side === b.side) {
      setSelected(b);
      return;
    }
    const left = a.side === 'L' ? a.value : b.value;
    const right = a.side === 'R' ? a.value : b.value;
    setSelected(null);
    if (partner.get(left) === right) {
      const next = [...matched, left];
      setMatched(next);
      fx.drop();
      haptic('success');
      if (next.length === q.pairs.length) {
        const ok = mistakes.current === 0;
        setTimeout(() => {
          if (ok) fx.correct();
          onAnswer(ok);
        }, 250);
      }
    } else {
      mistakes.current++;
      setWrong([`L:${left}`, `R:${right}`]);
      fx.wrong();
      shake();
      setTimeout(() => setWrong([]), 500);
    }
  };

  /* eslint-disable react-hooks/refs -- `start` is only read inside gesture callbacks, never during render */
  const pan = Gesture.Pan()
    .enabled(!locked && matched.length < q.pairs.length)
    .minDistance(0)
    .runOnJS(true)
    .onStart((e) => {
      const h = hit(e.x, e.y);
      start.current = h && !isMatched(h.side, h.value) ? h : null;
      if (start.current) {
        const a = anchor(start.current.side, start.current.value);
        sx.value = a.x;
        sy.value = a.y;
        ex.value = e.x;
        ey.value = e.y;
        drawing.value = 1;
        haptic('select');
      }
    })
    .onUpdate((e) => {
      if (!start.current) return;
      ex.value = e.x;
      ey.value = e.y;
    })
    .onEnd((e) => {
      drawing.value = 0;
      const from = start.current;
      start.current = null;
      if (!from) return;
      const to = hit(e.x, e.y);
      const moved = Math.hypot(e.translationX, e.translationY) > 12;
      if (to && to.side !== from.side && !isMatched(to.side, to.value)) {
        attempt(from, to);
      } else if (!moved) {
        // Tap: select, or complete a pair with the current selection.
        fx.tap();
        if (selected && selected.side !== from.side) attempt(selected, from);
        else setSelected(selected && selected.value === from.value ? null : from);
      }
    });
  /* eslint-enable react-hooks/refs */

  const liveLine = useAnimatedProps(() => ({ x1: sx.value, y1: sy.value, x2: ex.value, y2: ey.value, strokeOpacity: drawing.value }));

  const onItemLayout = (side: Side, value: string) => (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setItems((m) => ({ ...m, [`${side}:${value}`]: { x, y, w: width, h: height } }));
  };
  const onColLayout = (side: Side) => (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setCols((c) => ({ ...c, [side]: { x, y, w: width, h: height } }));
  };

  const renderItem = (side: Side, value: string) => {
    const done = isMatched(side, value);
    const left = side === 'L' ? value : q.pairs.find((p) => p.right === value)?.left;
    const color = done && left ? PAIR_COLORS[matched.indexOf(left) % PAIR_COLORS.length] : undefined;
    const isSel = selected?.side === side && selected.value === value;
    const isWrong = wrong.includes(`${side}:${value}`);
    const emojiOnly = value.length <= 3 && /\p{Extended_Pictographic}/u.test(value);
    return (
      <View
        key={value}
        onLayout={onItemLayout(side, value)}
        style={{
          minHeight: 58,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: colors.ink,
          backgroundColor: isWrong ? colors.berry : (color ?? (isSel ? colors['sun-soft'] : colors.paper)),
          transform: [{ scale: isSel ? 1.04 : 1 }],
          boxShadow: `${isSel ? 1 : 3}px ${isSel ? 1 : 3}px 0px ${colors.ink}`,
        }}
      >
        <Txt variant="subtitle" style={{ textAlign: 'center', fontSize: emojiOnly ? 30 : 15, lineHeight: emojiOnly ? 36 : 20, color: isWrong ? colors.paper : colors.ink }}>
          {value}
        </Txt>
      </View>
    );
  };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }, shakeStyle]} collapsable={false}>
        <Svg style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, pointerEvents: 'none' }} width="100%" height="100%">
          {matched.map((l) => {
            const a = anchor('L', l);
            const b = anchor('R', partner.get(l) ?? '');
            return (
              <G key={l}>
                <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.ink} strokeWidth={4} strokeLinecap="round" />
                <Circle cx={a.x} cy={a.y} r={6} fill={colors.ink} />
                <Circle cx={b.x} cy={b.y} r={6} fill={colors.ink} />
              </G>
            );
          })}
          <AnimatedLine animatedProps={liveLine} stroke={colors.grape} strokeWidth={5} strokeLinecap="round" strokeDasharray="10 8" />
        </Svg>
        <View onLayout={onColLayout('L')} style={{ width: '40%', gap: 12 }}>
          {lefts.map((v) => renderItem('L', v))}
        </View>
        <View onLayout={onColLayout('R')} style={{ width: '40%', gap: 12 }}>
          {rights.map((v) => renderItem('R', v))}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
