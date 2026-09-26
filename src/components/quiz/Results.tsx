import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Confetti } from '@/components/gamify/Confetti';
import { Kancil } from '@/components/mascot/Kancil';
import { Button, Chunky, Txt, useFrame } from '@/components/ui';
import type { Question } from '@/features/content/schema';
import { badgeTitle, type BadgeDef } from '@/features/gamify/badges';
import { quizPoints } from '@/features/gamify/xp';
import { useT } from '@/i18n';
import { formatDuration } from '@/lib/format';
import { accent, colors } from '@/theme';
import { Mistakes } from './Mistakes';

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
  /** Questions answered wrongly, to look back at (practice and review; not time attacks). */
  mistakes: Question[];
  /** Right answers that needed a hint (each worth half a point). */
  hinted?: number;
}

export function Results({ data, onDone, onRetry }: { data: ResultsData; onDone: () => void; onRetry: () => void }) {
  const { small, innerWidth } = useFrame();
  const t = useT();
  const [reviewing, setReviewing] = useState(false);
  const hinted = data.timeAttack ? 0 : (data.hinted ?? 0);
  // A hinted right answer is worth half a point, so stars and "perfect" need no hints.
  const ratio = data.total ? quizPoints(data.correct, hinted) / data.total : 0;
  const stars = data.timeAttack ? (data.correct >= 30 ? 3 : data.correct >= 18 ? 2 : data.correct > 0 ? 1 : 0) : ratio === 1 ? 3 : ratio >= 0.7 ? 2 : ratio > 0 ? 1 : 0;
  const mood = stars >= 2 ? 'cheer' : stars === 1 ? 'happy' : 'think';
  const headline = t(
    data.timeAttack
      ? data.newBest
        ? 'results.newBest'
        : 'results.timesUp'
      : ratio === 1
        ? 'results.perfect'
        : ratio >= 0.7
          ? 'results.wellDone'
          : ratio >= 0.4
            ? 'results.goodEffort'
            : 'results.keepPractising',
  );
  // Confetti is saved for real milestones so it still feels special.
  const celebrate = data.timeAttack ? data.newBest : data.total > 0 && ratio === 1;
  if (reviewing) return <Mistakes questions={data.mistakes} onBack={() => setReviewing(false)} />;
  return (
    <View style={{ flex: 1 }}>
      {celebrate && <Confetti count={24} />}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', gap: 14, paddingTop: 20, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        <Kancil mood={mood} size={small ? 90 : 150} />
        <Txt variant="hero" style={{ textAlign: 'center' }}>
          {headline}
        </Txt>
        <Txt variant="subtitle" style={{ color: colors.muted, textAlign: 'center' }}>
          {data.title}
        </Txt>
        {/* Read as one phrase ("2 of 3 stars") instead of three separate emoji. */}
        <View style={{ flexDirection: 'row', gap: 10 }} accessible accessibilityLabel={t('results.stars', stars)} testID="stars">
          {[0, 1, 2].map((i) => (
            <Txt key={i} style={{ fontSize: small ? 38 : 46, opacity: i < stars ? 1 : 0.2 }}>
              ⭐
            </Txt>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <Tile label={data.timeAttack ? t('results.score') : t('results.correct')} bg={colors.paper}>
            {data.timeAttack ? data.correct : `${data.correct}/${data.total}`}
          </Tile>
          <Tile label="XP" bg={colors.lime}>
            +{data.xp}
          </Tile>
          <Tile label={t('results.coins')} bg={colors['sun-soft']}>
            +{data.coins}
          </Tile>
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Txt variant="small">⏱ {formatDuration(data.seconds, t.lang)}</Txt>
          <Txt variant="small">{t('results.streak', data.streak)}</Txt>
          {hinted > 0 ? <Txt variant="small">{t('results.hints', hinted)}</Txt> : null}
        </View>
        {data.shieldEarned ? (
          <Txt variant="subtitle" style={{ textAlign: 'center' }} testID="shield-earned">
            {t('results.shield')}
          </Txt>
        ) : null}
        {data.badges.map((b) => (
          <View key={b.id} style={{ width: '100%' }}>
            <Chunky bg={accent(b.color).soft} innerStyle={{ padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Txt style={{ fontSize: 32 }}>{b.emoji}</Txt>
              <View style={{ flex: 1 }}>
                <Txt variant="label" style={{ color: colors.ink }}>
                  {t('results.newBadge')}
                </Txt>
                <Txt variant="subtitle">{badgeTitle(b, t.lang)}</Txt>
              </View>
            </Chunky>
          </View>
        ))}
      </ScrollView>
      <View style={{ gap: 10, paddingVertical: 12 }}>
        <Button label={t('common.continue')} tone="lime" size="lg" full onPress={onDone} testID="results-continue" />
        {/* Side by side where both labels fit (from ~360px phones), else stacked. */}
        <View style={{ flexDirection: innerWidth >= 320 ? 'row' : 'column', gap: 10 }}>
          {data.mistakes.length > 0 && (
            <View style={{ flex: innerWidth >= 320 ? 1 : undefined }}>
              <Button label={t('results.mistakes', data.mistakes.length)} tone="paper" full onPress={() => setReviewing(true)} testID="see-mistakes" />
            </View>
          )}
          <View style={{ flex: innerWidth >= 320 ? 1 : undefined }}>
            <Button label={t('results.playAgain')} tone="paper" full onPress={onRetry} />
          </View>
        </View>
      </View>
    </View>
  );
}
