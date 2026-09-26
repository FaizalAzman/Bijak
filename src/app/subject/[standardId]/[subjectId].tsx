import { router, useLocalSearchParams } from 'expo-router';
import { Check, Lock } from 'lucide-react-native';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Kancil } from '@/components/mascot/Kancil';
import { Chunky, PressChunky, ProgressBar, Screen, TopBar, Txt } from '@/components/ui';
import { useChildContent } from '@/hooks/useChildContent';
import { subjectProgress, topicStatus } from '@/features/progress/selectors';
import { standardName, useT } from '@/i18n';
import { useLayout } from '@/hooks/useLayout';
import { useProgress } from '@/store/app';
import { accent, colors } from '@/theme';

function Ring({ ratio, color, size }: { ratio: number; color: string; size: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.line} strokeWidth={7} fill="none" />
      {ratio > 0 && (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={7}
          fill="none"
          strokeDasharray={`${c * ratio} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </Svg>
  );
}

/** Duolingo-style winding learning path of topics. */
export default function SubjectPath() {
  const { standardId, subjectId } = useLocalSearchParams<{ standardId: string; subjectId: string }>();
  const index = useChildContent();
  // Keep the winding path inside the screen: 180px-wide nodes swing at most to the edges.
  const { innerWidth } = useLayout();
  const swing = Math.max(0, Math.min(90, (innerWidth - 180) / 2));
  const p = useProgress();
  const standard = index.standard(standardId);
  const subject = index.subject(standardId, subjectId);
  const t = useT();
  if (!standard || !subject) {
    return (
      <Screen header={<TopBar title={t('common.notFound')} />}>
        <Txt>{t('subject.notAvailable')}</Txt>
      </Screen>
    );
  }
  const a = accent(subject.color);
  const sp = subjectProgress(subject, p);
  const statuses = subject.topics.map((topic) => topicStatus(topic, p));
  const current = statuses.findIndex((s) => !s.mastered);

  return (
    <Screen header={<TopBar title={subject.name} />}>
      <Chunky bg={a.strong} innerStyle={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Txt style={{ fontSize: 40 }}>{subject.emoji}</Txt>
          <View style={{ flex: 1 }}>
            <Txt variant="label" style={{ color: colors.ink }}>
              {standardName(standard, t.lang)} · {standardName(standard, t.lang === 'ms' ? 'en' : 'ms')}
            </Txt>
            <Txt variant="display">{subject.nameAlt ?? subject.name}</Txt>
          </View>
        </View>
        <ProgressBar value={sp.ratio} color={colors.paper} height={14} />
        <Txt variant="small" style={{ color: colors.ink }}>
          {t('subject.progress', sp.mastered, sp.total)}
        </Txt>
      </Chunky>

      <View style={{ paddingVertical: 26, alignItems: 'center' }}>
        {subject.topics.map((topic, i) => {
          const st = statuses[i];
          const offset = Math.sin(i * 1.15) * swing;
          const isCurrent = i === current;
          const size = 92;
          return (
            <View key={topic.id} style={{ marginBottom: 18 }}>
              <View style={{ alignItems: 'center', transform: [{ translateX: offset }], width: 180 }}>
                {isCurrent && (
                  <View style={{ backgroundColor: colors.ink, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginBottom: 8 }}>
                    <Txt style={{ color: colors.lime, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, letterSpacing: 1 }}>{st.stars ? t('subject.continue') : t('subject.start')}</Txt>
                  </View>
                )}
                <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                  <Ring ratio={st.ratio} color={st.mastered ? colors.mint : a.strong} size={size} />
                  <PressChunky
                    onPress={() => router.push(`/topic/${topic.id}`)}
                    bg={st.mastered ? colors.mint : isCurrent ? a.strong : colors.paper}
                    radius={34}
                    depth={5}
                    accessibilityLabel={topic.title}
                    innerStyle={{ width: 68, height: 68, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Txt style={{ fontSize: 30 }}>{topic.emoji}</Txt>
                  </PressChunky>
                  {st.mastered && (
                    <View
                      style={{
                        position: 'absolute',
                        right: 2,
                        top: 2,
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: colors.ink,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={15} color={colors.lime} strokeWidth={3.5} />
                    </View>
                  )}
                </View>
                <Txt variant="subtitle" numberOfLines={2} style={{ textAlign: 'center', marginTop: 4, fontSize: 14 }}>
                  {topic.title}
                </Txt>
                <Txt style={{ fontSize: 13, letterSpacing: 2 }}>{'★'.repeat(st.stars) + '☆'.repeat(3 - st.stars)}</Txt>
              </View>
            </View>
          );
        })}
        <View style={{ alignItems: 'center', marginTop: 8, gap: 6 }}>
          <Kancil mood={sp.mastered === sp.total && sp.total > 0 ? 'cheer' : 'idle'} size={110} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {sp.mastered === sp.total && sp.total > 0 ? null : <Lock size={14} color={colors.muted} />}
            <Txt variant="small">{sp.mastered === sp.total && sp.total > 0 ? t('subject.complete', subject.name) : t('subject.masterAll', subject.name)}</Txt>
          </View>
        </View>
      </View>
    </Screen>
  );
}
