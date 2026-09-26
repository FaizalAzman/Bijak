import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { SlideInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Kancil } from '@/components/mascot/Kancil';
import { Button, Txt } from '@/components/ui';
import type { Question } from '@/features/content/schema';
import { hashString } from '@/lib/random';
import { colors } from '@/theme';
import { correctAnswerText } from './types';

const PRAISE = { en: ['Awesome!', 'Great job!', 'Brilliant!', 'Hebat!', 'Well done!'], ms: ['Hebat!', 'Bagus!', 'Syabas!', 'Pandai!', 'Terbaik!'] };
const NUDGE = { en: ['Not quite…', 'Nice try!', 'Almost!'], ms: ['Hampir!', 'Cuba lagi!', 'Sikit lagi!'] };

export function FeedbackSheet({ q, correct, xp, combo, onContinue }: { q: Question; correct: boolean; xp: number; combo: number; onContinue: () => void }) {
  const insets = useSafeAreaInsets();
  const title = useMemo(() => {
    const list = (correct ? PRAISE : NUDGE)[q.lang];
    return list[hashString(q.id + q.prompt) % list.length];
  }, [correct, q]);
  const answer = !correct ? correctAnswerText(q) : null;
  const bg = correct ? colors['mint-soft'] : colors['berry-soft'];
  const fg = correct ? '#177A3C' : '#B3264A';
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18).stiffness(180)}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: bg,
        borderTopWidth: 2.5,
        borderColor: colors.ink,
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: insets.bottom + 16,
      }}
    >
      <View style={{ maxWidth: 680, width: '100%', alignSelf: 'center', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Kancil mood={correct ? 'happy' : 'sad'} size={70} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="display" style={{ color: fg }}>
              {title}
            </Txt>
            {correct ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Animated.View
                  entering={ZoomIn.delay(120).springify()}
                  style={{ backgroundColor: colors.lime, borderWidth: 2, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}
                >
                  <Txt style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13 }}>+{xp} XP</Txt>
                </Animated.View>
                {combo >= 3 && (
                  <Animated.View
                    entering={ZoomIn.delay(220).springify()}
                    style={{ backgroundColor: colors.tangerine, borderWidth: 2, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}
                  >
                    <Txt style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, color: colors.paper }}>🔥 {combo} in a row</Txt>
                  </Animated.View>
                )}
              </View>
            ) : answer ? (
              <Txt variant="subtitle" style={{ color: colors.ink }}>
                Answer: <Txt style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', color: fg }}>{answer}</Txt>
              </Txt>
            ) : (
              <Txt variant="small" style={{ color: colors.ink }}>
                We’ll practise this one again soon.
              </Txt>
            )}
          </View>
        </View>
        {q.explain ? (
          <Txt variant="body" style={{ color: colors.ink }}>
            💡 {q.explain}
          </Txt>
        ) : null}
        <Button label="Continue" tone={correct ? 'mint' : 'berry'} size="lg" full onPress={onContinue} testID="continue" />
      </View>
    </Animated.View>
  );
}
