import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, ChevronRight, Play, Timer } from 'lucide-react-native';
import { View } from 'react-native';
import { toSlides } from '@/components/lesson/LessonBlocks';
import { Chunky, PressChunky, Screen, SectionLabel, Tag, TopBar, Txt } from '@/components/ui';
import { useChildContent } from '@/hooks/useChildContent';
import { REWARDS } from '@/features/gamify/xp';
import { topicStatus } from '@/features/progress/selectors';
import { useActiveProfile, useProgress } from '@/store/app';
import { accent, colors } from '@/theme';

export default function TopicScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const ref = useChildContent().topic(topicId);
  const p = useProgress();
  const profile = useActiveProfile();
  if (!ref) {
    return (
      <Screen header={<TopBar title="Not found" />}>
        <Txt>This topic is not available.</Txt>
      </Screen>
    );
  }
  const { topic, subject, standard } = ref;
  const a = accent(subject.color);
  const st = topicStatus(topic, p);
  const stat = p.topics[topic.id];

  return (
    <Screen header={<TopBar title={subject.name} />}>
      <View>
        <Chunky bg={a.soft} innerStyle={{ padding: 18, gap: 10, alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View
              style={{
                width: 66,
                height: 66,
                borderRadius: 22,
                backgroundColor: a.strong,
                borderWidth: 2,
                borderColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt style={{ fontSize: 34 }}>{topic.emoji}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="label">
                {standard.title} · {subject.name}
              </Txt>
              <Txt variant="display" style={{ fontSize: 24, lineHeight: 30 }}>
                {topic.title}
              </Txt>
              {topic.titleAlt ? <Txt variant="small">{topic.titleAlt}</Txt> : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Tag label={`${'★'.repeat(st.stars)}${'☆'.repeat(3 - st.stars)}`} bg={colors.sun} />
            {stat?.answered ? <Tag label={`${Math.round((stat.correct / stat.answered) * 100)}% accuracy`} bg={colors.paper} /> : null}
            {st.mastered ? <Tag label="Mastered" /> : null}
            {profile?.schoolTopics?.[subject.id] === topic.id ? <Tag label="🏫 At school this week" bg={colors['sky-soft']} /> : null}
          </View>
        </Chunky>
      </View>

      {topic.objectives.length > 0 && (
        <View>
          <SectionLabel>You will learn</SectionLabel>
          <Chunky depth={3} innerStyle={{ padding: 14, gap: 10 }}>
            {topic.objectives.map((o) => (
              <View key={o.code + o.text} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <View style={{ backgroundColor: colors.ink, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 1 }}>
                  <Txt variant="mono" style={{ color: colors.lime, fontSize: 11 }}>
                    {o.code}
                  </Txt>
                </View>
                <Txt variant="body" style={{ flex: 1 }}>
                  {o.text}
                </Txt>
              </View>
            ))}
          </Chunky>
        </View>
      )}

      {topic.lesson.length > 0 && (
        <View>
          <SectionLabel>Lesson</SectionLabel>
          <PressChunky
            onPress={() => router.push(`/lesson/${topic.id}`)}
            bg={st.lessonDone ? colors.paper : colors.lime}
            innerStyle={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            accessibilityLabel={st.lessonDone ? 'Read the lesson again' : 'Read the lesson'}
          >
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={22} color={colors.lime} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="subtitle">{st.lessonDone ? 'Read again' : 'Read the lesson'}</Txt>
              <Txt variant="small">{st.lessonDone ? 'Completed ✓' : `${toSlides(topic.lesson).length} cards · +${REWARDS.lesson.xp} XP`}</Txt>
            </View>
            <ChevronRight size={22} color={colors.ink} strokeWidth={3} />
          </PressChunky>
        </View>
      )}

      <View>
        <SectionLabel>Quizzes</SectionLabel>
        <View style={{ gap: 12 }}>
          {topic.quizzes.map((q) => {
            const best = stat?.best[q.id];
            const timed = q.mode === 'timeAttack';
            return (
              <PressChunky
                key={q.id}
                onPress={() => router.push(`/quiz/${q.id}`)}
                innerStyle={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                accessibilityLabel={q.title}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: timed ? colors.sun : a.strong,
                    borderWidth: 2,
                    borderColor: colors.ink,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {timed ? <Timer size={22} color={colors.ink} strokeWidth={2.5} /> : <Play size={20} color={colors.ink} fill={colors.ink} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="subtitle">{q.title}</Txt>
                  <Txt variant="small">{q.generator ? `${q.count ?? 10} questions · new every time` : `${q.count ?? q.questions.length} questions`}</Txt>
                </View>
                {best != null ? (
                  <Tag label={`${best}%`} bg={best >= 80 ? colors.mint : best >= 50 ? colors.sun : colors['berry-soft']} />
                ) : (
                  <Tag label="New" bg={colors['sky-soft']} />
                )}
              </PressChunky>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
