import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Confetti } from '@/components/gamify/Confetti';
import { Kancil } from '@/components/mascot/Kancil';
import { Button, Chunky, Txt } from '@/components/ui';
import type { BadgeDef } from '@/features/gamify/badges';
import { formatDuration } from '@/lib/format';
import { accent, colors } from '@/theme';

function CountUp({ to, prefix = '' }: { to: number; prefix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / 900);
      setV(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return (
    <Txt variant="hero" style={{ fontSize: 30, lineHeight: 36 }}>
      {prefix}
      {v}
    </Txt>
  );
}

function Tile({ label, children, bg, delay }: { label: string; children: React.ReactNode; bg: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={{ flex: 1 }}>
      <Chunky bg={bg} innerStyle={{ padding: 12, alignItems: 'center', gap: 2 }}>
        <Txt variant="label" style={{ color: colors.ink }}>
          {label}
        </Txt>
        {children}
      </Chunky>
    </Animated.View>
  );
}

export interface ResultsData {
  title: string;
  timeAttack: boolean;
  correct: number;
  total: number;
  xp: number;
  coins: number;
  seconds: number;
  streak: number;
  newBest: boolean;
  badges: BadgeDef[];
}

export function Results({ data, onDone, onRetry }: { data: ResultsData; onDone: () => void; onRetry: () => void }) {
  const ratio = data.total ? data.correct / data.total : 0;
  const stars = data.timeAttack ? (data.correct >= 30 ? 3 : data.correct >= 18 ? 2 : data.correct > 0 ? 1 : 0) : ratio === 1 ? 3 : ratio >= 0.7 ? 2 : ratio > 0 ? 1 : 0;
  const mood = stars >= 2 ? 'cheer' : stars === 1 ? 'happy' : 'think';
  const headline = data.timeAttack
    ? data.newBest
      ? 'New best score!'
      : 'Time’s up!'
    : ratio === 1
      ? 'Perfect score!'
      : ratio >= 0.7
        ? 'Well done!'
        : ratio >= 0.4
          ? 'Good effort!'
          : 'Keep practising!';
  return (
    <View style={{ flex: 1 }}>
      {stars >= 2 && <Confetti />}
      <View style={{ flex: 1, alignItems: 'center', gap: 14, paddingTop: 20 }}>
        <Animated.View entering={ZoomIn.springify().damping(10)}>
          <Kancil mood={mood} size={150} />
        </Animated.View>
        <Txt variant="hero" style={{ textAlign: 'center' }}>
          {headline}
        </Txt>
        <Txt variant="subtitle" style={{ color: colors.muted, textAlign: 'center' }}>
          {data.title}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              entering={ZoomIn.delay(300 + i * 180)
                .springify()
                .damping(8)}
            >
              <Txt style={{ fontSize: 46, opacity: i < stars ? 1 : 0.2 }}>⭐</Txt>
            </Animated.View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <Tile label={data.timeAttack ? 'Score' : 'Correct'} bg={colors.paper} delay={200}>
            <Txt variant="hero" style={{ fontSize: 30, lineHeight: 36 }}>
              {data.timeAttack ? data.correct : `${data.correct}/${data.total}`}
            </Txt>
          </Tile>
          <Tile label="XP" bg={colors.lime} delay={280}>
            <CountUp to={data.xp} prefix="+" />
          </Tile>
          <Tile label="Coins" bg={colors['sun-soft']} delay={360}>
            <CountUp to={data.coins} prefix="+" />
          </Tile>
        </View>
        <Animated.View entering={FadeInDown.delay(440)} style={{ flexDirection: 'row', gap: 16 }}>
          <Txt variant="small">⏱ {formatDuration(data.seconds)}</Txt>
          <Txt variant="small">🔥 {data.streak}-day streak</Txt>
        </Animated.View>
        {data.badges.map((b, i) => (
          <Animated.View key={b.id} entering={FadeInDown.delay(520 + i * 120).springify()} style={{ width: '100%' }}>
            <Chunky bg={accent(b.color).soft} innerStyle={{ padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Txt style={{ fontSize: 32 }}>{b.emoji}</Txt>
              <View style={{ flex: 1 }}>
                <Txt variant="label" style={{ color: colors.ink }}>
                  New badge!
                </Txt>
                <Txt variant="subtitle">{b.title}</Txt>
              </View>
            </Chunky>
          </Animated.View>
        ))}
      </View>
      <View style={{ gap: 10, paddingVertical: 12 }}>
        <Button label="Continue" tone="lime" size="lg" full onPress={onDone} testID="results-continue" />
        <Button label="Play again" tone="paper" full onPress={onRetry} />
      </View>
    </View>
  );
}
