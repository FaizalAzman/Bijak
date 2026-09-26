import { router, useLocalSearchParams } from 'expo-router';
import { Check, Lock } from 'lucide-react-native';
import { View } from 'react-native';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useEffect } from 'react';
import { Kancil } from '@/components/mascot/Kancil';
import { Chunky, PressChunky, ProgressBar, Screen, TopBar, Txt } from '@/components/ui';
import { useContentIndex } from '@/features/content/registry';
import { subjectProgress, topicStatus } from '@/features/progress/selectors';
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

function Pulse({ children, active }: { children: React.ReactNode; active: boolean }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = active ? withRepeat(withSequence(withTiming(1.06, { duration: 700 }), withTiming(1, { duration: 700 })), -1) : 1;
  }, [active, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Duolingo-style winding learning path of topics. */
export default function SubjectPath() {
  const { standardId, subjectId } = useLocalSearchParams<{ standardId: string; subjectId: string }>();
  const index = useContentIndex();
  const p = useProgress();
  const standard = index.standard(standardId);
  const subject = index.subject(standardId, subjectId);
  if (!standard || !subject) {
    return (
      <Screen header={<TopBar title="Not found" />}>
        <Txt>This subject is not available.</Txt>
      </Screen>
    );
  }
  const a = accent(subject.color);
  const sp = subjectProgress(subject, p);
  const statuses = subject.topics.map((t) => topicStatus(t, p));
  const current = statuses.findIndex((s) => !s.mastered);

  return (
    <Screen header={<TopBar title={subject.name} />}>
      <Chunky bg={a.strong} innerStyle={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Txt style={{ fontSize: 40 }}>{subject.emoji}</Txt>
          <View style={{ flex: 1 }}>
            <Txt variant="label" style={{ color: colors.ink }}>
              {standard.title} · {standard.titleAlt}
            </Txt>
            <Txt variant="display">{subject.nameAlt ?? subject.name}</Txt>
          </View>
        </View>
        <ProgressBar value={sp.ratio} color={colors.paper} height={14} />
        <Txt variant="small" style={{ color: colors.ink }}>
          {sp.mastered} of {sp.total} topics mastered
        </Txt>
      </Chunky>

      <View style={{ paddingVertical: 26, alignItems: 'center' }}>
        {subject.topics.map((t, i) => {
          const st = statuses[i];
          const offset = Math.sin(i * 1.15) * 80;
          const isCurrent = i === current;
          const size = 92;
          return (
            <Animated.View
              key={t.id}
              entering={FadeInUp.delay(i * 50)
                .springify()
                .damping(14)}
              style={{ marginBottom: 18 }}
            >
              <View style={{ alignItems: 'center', transform: [{ translateX: offset }], width: 180 }}>
                {isCurrent && (
                  <View style={{ backgroundColor: colors.ink, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginBottom: 8 }}>
                    <Txt style={{ color: colors.lime, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 12, letterSpacing: 1 }}>{st.stars ? 'CONTINUE' : 'START'}</Txt>
                  </View>
                )}
                <Pulse active={isCurrent}>
                  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                    <Ring ratio={st.ratio} color={st.mastered ? colors.mint : a.strong} size={size} />
                    <PressChunky
                      onPress={() => router.push(`/topic/${t.id}`)}
                      bg={st.mastered ? colors.mint : isCurrent ? a.strong : colors.paper}
                      radius={34}
                      depth={5}
                      accessibilityLabel={t.title}
                      innerStyle={{ width: 68, height: 68, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Txt style={{ fontSize: 30 }}>{t.emoji}</Txt>
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
                </Pulse>
                <Txt variant="subtitle" numberOfLines={2} style={{ textAlign: 'center', marginTop: 4, fontSize: 14 }}>
                  {t.title}
                </Txt>
                <Txt style={{ fontSize: 13, letterSpacing: 2 }}>{'★'.repeat(st.stars) + '☆'.repeat(3 - st.stars)}</Txt>
              </View>
            </Animated.View>
          );
        })}
        <View style={{ alignItems: 'center', marginTop: 8, gap: 6 }}>
          <Kancil mood={sp.mastered === sp.total && sp.total > 0 ? 'cheer' : 'idle'} size={110} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {sp.mastered === sp.total && sp.total > 0 ? null : <Lock size={14} color={colors.muted} />}
            <Txt variant="small">{sp.mastered === sp.total && sp.total > 0 ? `${subject.name} complete! 🏆` : `Master every topic to earn the ${subject.name} badge`}</Txt>
          </View>
        </View>
      </View>
    </Screen>
  );
}
