import { Volume2 } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, Chunky, Txt } from '@/components/ui';
import type { Question } from '@/features/content/schema';
import { useT } from '@/i18n';
import { fx, speak } from '@/lib/feedback';
import { colors } from '@/theme';
import { answerLines, LABELS } from './types';

/** "Two plus two" → "Two plus two." (read aloud with a pause between the question and its answer). */
const sentence = (text: string) => (/[.!?…]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

/** After a quiz: each question the child missed, with the right answer and why (in the question's language). */
export function Mistakes({ questions, onBack }: { questions: Question[]; onBack: () => void }) {
  const t = useT();
  return (
    <View style={{ flex: 1 }} testID="mistakes">
      <ScrollView contentContainerStyle={{ gap: 12, paddingTop: 16, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        <Txt variant="display">{t('mistakes.title')}</Txt>
        <Txt variant="small">{t('mistakes.intro')}</Txt>
        {questions.map((q, i) => {
          const lines = answerLines(q);
          const label = LABELS[q.lang];
          return (
            <Chunky key={`${i}-${q.id}`} innerStyle={{ padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                {q.visual ? <Txt style={{ fontSize: 28 }}>{q.visual}</Txt> : null}
                <Txt variant="subtitle" style={{ flex: 1 }}>
                  {q.prompt}
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={label.readAloud}
                  onPress={() => {
                    fx.tap();
                    speak([q.prompt, `${label.rightAnswer}: ${lines.join(', ')}`].map(sentence).join(' '), q.lang);
                  }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: colors.sky,
                    borderWidth: 2,
                    borderColor: colors.ink,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Volume2 size={18} color={colors.ink} strokeWidth={2.5} />
                </Pressable>
              </View>
              <View style={{ backgroundColor: colors['mint-soft'], borderRadius: 12, borderWidth: 1.5, borderColor: colors.ink, padding: 10, gap: 2 }}>
                <Txt variant="label" style={{ color: colors.ink }}>
                  {label.rightAnswer}
                </Txt>
                {lines.map((line) => (
                  <Txt key={line} variant="body">
                    {line}
                  </Txt>
                ))}
              </View>
              {q.explain ? <Txt variant="small">{`💡 ${q.explain}`}</Txt> : null}
            </Chunky>
          );
        })}
      </ScrollView>
      <View style={{ paddingVertical: 12 }}>
        <Button label={t('mistakes.back')} tone="lime" size="lg" full onPress={onBack} testID="mistakes-back" />
      </View>
    </View>
  );
}
