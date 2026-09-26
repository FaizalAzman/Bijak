import { View } from 'react-native';
import { Confetti } from '@/components/gamify/Confetti';
import { Kancil } from '@/components/mascot/Kancil';
import { Button, Chunky, Txt, useFrame } from '@/components/ui';
import type { BadgeDef } from '@/features/gamify/badges';
import { formatDuration } from '@/lib/format';
import { accent, colors } from '@/theme';

function Tile({ label, children, bg }: { label: string; children: React.ReactNode; bg: string }) {
  return (
    <Chunky bg={bg} style={{ flex: 1 }} innerStyle={{ padding: 12, alignItems: 'center', gap: 2 }}>
      <Txt variant="label" style={{ color: colors.ink }}>
        {label}
      </Txt>
      <Txt variant="hero" style={{ fontSize: 30, lineHeight: 36 }}>
        {children}
      </Txt>
    </Chunky>
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
  /** A rest-day shield was earned by this quiz (streak milestone). */
  shieldEarned?: boolean;
  newBest: boolean;
  badges: BadgeDef[];
}

export function Results({ data, onDone, onRetry }: { data: ResultsData; onDone: () => void; onRetry: () => void }) {
  const { small } = useFrame();
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
  // Confetti is saved for real milestones so it still feels special.
  const celebrate = data.timeAttack ? data.newBest : data.total > 0 && ratio === 1;
  return (
    <View style={{ flex: 1 }}>
      {celebrate && <Confetti count={24} />}
      <View style={{ flex: 1, alignItems: 'center', gap: 14, paddingTop: 20 }}>
        <Kancil mood={mood} size={small ? 110 : 150} />
        <Txt variant="hero" style={{ textAlign: 'center' }}>
          {headline}
        </Txt>
        <Txt variant="subtitle" style={{ color: colors.muted, textAlign: 'center' }}>
          {data.title}
        </Txt>
        {/* Read as one phrase ("2 of 3 stars") instead of three separate emoji. */}
        <View style={{ flexDirection: 'row', gap: 10 }} accessible accessibilityLabel={`${stars} of 3 stars`} testID="stars">
          {[0, 1, 2].map((i) => (
            <Txt key={i} style={{ fontSize: 46, opacity: i < stars ? 1 : 0.2 }}>
              ⭐
            </Txt>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <Tile label={data.timeAttack ? 'Score' : 'Correct'} bg={colors.paper}>
            {data.timeAttack ? data.correct : `${data.correct}/${data.total}`}
          </Tile>
          <Tile label="XP" bg={colors.lime}>
            +{data.xp}
          </Tile>
          <Tile label="Coins" bg={colors['sun-soft']}>
            +{data.coins}
          </Tile>
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Txt variant="small">⏱ {formatDuration(data.seconds)}</Txt>
          <Txt variant="small">🔥 {data.streak}-day streak</Txt>
        </View>
        {data.shieldEarned ? (
          <Txt variant="subtitle" style={{ textAlign: 'center' }} testID="shield-earned">
            🛡️ You earned a rest-day shield!
          </Txt>
        ) : null}
        {data.badges.map((b) => (
          <View key={b.id} style={{ width: '100%' }}>
            <Chunky bg={accent(b.color).soft} innerStyle={{ padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Txt style={{ fontSize: 32 }}>{b.emoji}</Txt>
              <View style={{ flex: 1 }}>
                <Txt variant="label" style={{ color: colors.ink }}>
                  New badge!
                </Txt>
                <Txt variant="subtitle">{b.title}</Txt>
              </View>
            </Chunky>
          </View>
        ))}
      </View>
      <View style={{ gap: 10, paddingVertical: 12 }}>
        <Button label="Continue" tone="lime" size="lg" full onPress={onDone} testID="results-continue" />
        <Button label="Play again" tone="paper" full onPress={onRetry} />
      </View>
    </View>
  );
}
