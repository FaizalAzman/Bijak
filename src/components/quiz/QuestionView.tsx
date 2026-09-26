import { Lightbulb, Volume2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Button, Txt } from '@/components/ui';
import type { Question } from '@/features/content/schema';
import { fx, speak } from '@/lib/feedback';
import { colors } from '@/theme';
import { swapIn } from '@/theme/motion';
import { FillBlank } from './FillBlank';
import { hintFor } from './hints';
import { Match } from './Match';
import { MCQ } from './MCQ';
import { Numpad } from './Numpad';
import { Order } from './Order';
import { Sort } from './Sort';
import { TrueFalse } from './TrueFalse';
import { INSTRUCTION, LABELS } from './types';

/**
 * One question: instruction, prompt (with read-aloud) and its engine. Pass `onHint` to offer a
 * hint button (practice and review only); it is called once, when the child asks for the hint.
 */
export function QuestionView({ q, onAnswer, locked, fast, onHint }: { q: Question; onAnswer: (ok: boolean) => void; locked: boolean; fast?: boolean; onHint?: () => void }) {
  const hint = useMemo(() => (onHint && !fast ? hintFor(q) : null), [q, onHint, fast]);
  const [hintShown, setHintShown] = useState(false);
  const body = (() => {
    switch (q.type) {
      case 'mcq':
        return <MCQ q={q} onAnswer={onAnswer} locked={locked} fast={fast} />;
      case 'trueFalse':
        return <TrueFalse q={q} onAnswer={onAnswer} locked={locked} />;
      case 'match':
        return <Match q={q} onAnswer={onAnswer} locked={locked} />;
      case 'order':
        return <Order q={q} onAnswer={onAnswer} locked={locked} />;
      case 'sort':
        return <Sort q={q} onAnswer={onAnswer} locked={locked} />;
      case 'fillBlank':
        return <FillBlank q={q} onAnswer={onAnswer} locked={locked} />;
      case 'numpad':
        return <Numpad q={q} onAnswer={onAnswer} locked={locked} />;
    }
  })();
  const bigPrompt = q.prompt.length < 26 && fast;
  return (
    // A quick fade marks the new question; time-attack skips it so answers stay instant.
    <Animated.View entering={fast ? undefined : swapIn} style={{ gap: 18 }}>
      <View style={{ gap: 10 }}>
        {!fast && <Txt variant="label">{INSTRUCTION[q.lang][q.type]}</Txt>}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {q.visual ? (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: colors['sun-soft'],
                borderWidth: 2,
                borderColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt style={{ fontSize: 34 }}>{q.visual}</Txt>
            </View>
          ) : null}
          <Txt
            variant={bigPrompt ? 'hero' : 'display'}
            style={{
              flex: 1,
              fontSize: bigPrompt ? 40 : q.prompt.length > 70 ? 20 : 24,
              lineHeight: bigPrompt ? 48 : q.prompt.length > 70 ? 27 : 31,
              textAlign: bigPrompt ? 'center' : 'left',
            }}
          >
            {q.prompt}
          </Txt>
          {!fast && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={LABELS[q.lang].readAloud}
              onPress={() => {
                fx.tap();
                speak(q.prompt, q.lang);
              }}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: colors.sky,
                borderWidth: 2,
                borderColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Volume2 size={20} color={colors.ink} strokeWidth={2.5} />
            </Pressable>
          )}
        </View>
        {hint && hintShown ? (
          <View style={{ backgroundColor: colors['sun-soft'], borderRadius: 14, borderWidth: 2, borderColor: colors.ink, padding: 10 }} testID="hint">
            <Txt variant="body">{`💡 ${hint}`}</Txt>
          </View>
        ) : hint && !locked ? (
          <Button
            label={LABELS[q.lang].hint}
            tone="paper"
            size="sm"
            icon={<Lightbulb size={16} color={colors.ink} strokeWidth={2.5} />}
            onPress={() => {
              fx.tap();
              setHintShown(true);
              onHint?.();
            }}
            testID="hint-button"
          />
        ) : null}
      </View>
      {body}
    </Animated.View>
  );
}
