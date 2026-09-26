import { router } from 'expo-router';
import { ArrowRight, Brain } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { ArcadeCard, SubjectCard } from '@/components/gamify/Cards';
import { KidHeader } from '@/components/gamify/KidHeader';
import { LevelCard } from '@/components/gamify/LevelCard';
import { QuestRow } from '@/components/gamify/QuestRow';
import { TAB_BAR_SPACE } from '@/components/gamify/TabBar';
import { MascotSays } from '@/components/mascot/MascotSays';
import type { KancilMood } from '@/components/mascot/Kancil';
import { Chunky, Grid, HScroll, PressChunky, Screen, SectionLabel, Txt } from '@/components/ui';
import { useContentIndex } from '@/features/content/registry';
import { nextTopic, subjectProgress } from '@/features/progress/selectors';
import { dueCards } from '@/features/srs/srs';
import { useLayout } from '@/hooks/useLayout';
import { useNow } from '@/hooks/useNow';
import { dayKey } from '@/lib/date';
import { liveStreak, useActiveProfile, useProgress } from '@/store/app';
import { accent, colors } from '@/theme';

export default function Home() {
  const profile = useActiveProfile();
  const p = useProgress();
  const index = useContentIndex();
  const standard = profile ? (index.standardByLevel(profile.level) ?? index.standards[0]) : undefined;
  const now = useNow();
  const layout = useLayout('wide');
  const due = useMemo(() => dueCards(p.srs, now, 50).length, [p.srs, now]);
  const next = useMemo(() => nextTopic(standard, p), [standard, p]);
  const today = dayKey();
  const studiedToday = p.streak.lastDay === today;
  const streak = liveStreak(p);
  const allQuestsDone = p.quests.list.length > 0 && p.quests.list.every((q) => q.claimed);

  const mascot: { text: string; mood: KancilMood } = allQuestsDone
    ? { text: 'All quests done today! Hebat! 🎉', mood: 'cheer' }
    : due > 0
      ? { text: `I saved ${due} tricky question${due > 1 ? 's' : ''} for you. Let's beat ${due > 1 ? 'them' : 'it'}!`, mood: 'think' }
      : !studiedToday && streak > 0
        ? { text: `Your ${streak}-day streak needs you! One quiz keeps it alive 🔥`, mood: 'wow' }
        : studiedToday
          ? { text: 'Great work today! Want to try another challenge?', mood: 'happy' }
          : { text: 'Ready for today’s adventure? Let’s learn something new!', mood: 'wave' };

  if (!profile || !standard) return null;
  const twoColumns = layout.innerWidth >= 720;
  const avatarMood = studiedToday ? 'excited' : p.streak.lastDay && streak === 0 ? 'sleepy' : 'happy';

  const mascotSize = layout.isTablet ? 100 : layout.small ? 72 : 84;
  const hero = (
    <View style={{ gap: 16 }}>
      <MascotSays text={mascot.text} mood={mascot.mood} size={mascotSize} />
      <LevelCard profile={profile} progress={p} mood={avatarMood} />
    </View>
  );
  const review = (
    <>
      {due > 0 && (
        <View style={{ marginTop: 16 }}>
          <PressChunky
            onPress={() => router.push('/quiz/review')}
            bg={colors['grape-soft']}
            innerStyle={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            accessibilityLabel="Review tricky questions"
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: colors.grape,
                borderWidth: 2,
                borderColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Brain size={26} color={colors.paper} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="subtitle">Fix tricky questions</Txt>
              <Txt variant="small">{due} ready for review · extra XP</Txt>
            </View>
            <ArrowRight size={22} color={colors.ink} strokeWidth={3} />
          </PressChunky>
        </View>
      )}
    </>
  );
  const continueBlock = (
    <>
      {next && (
        <View>
          <SectionLabel>Continue learning</SectionLabel>
          <PressChunky
            onPress={() => router.push(`/topic/${next.topic.id}`)}
            bg={accent(next.subject.color).strong}
            innerStyle={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
            accessibilityLabel={`Continue ${next.topic.title}`}
          >
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                backgroundColor: colors.paper,
                borderWidth: 2,
                borderColor: colors.ink,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt style={{ fontSize: 30 }}>{next.topic.emoji}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="label" style={{ color: colors.ink, opacity: 0.7 }}>
                {next.subject.name}
              </Txt>
              <Txt variant="title" numberOfLines={2}>
                {next.topic.title}
              </Txt>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRight size={22} color={colors.lime} strokeWidth={3} />
            </View>
          </PressChunky>
        </View>
      )}
    </>
  );
  const quests = (
    <View>
      <SectionLabel
        right={
          <Txt variant="small" onPress={() => router.push('/quests')} style={{ color: colors.grape }}>
            See all
          </Txt>
        }
      >
        Daily quests
      </SectionLabel>
      <View style={{ gap: 10 }}>
        {p.quests.list.map((q) => (
          <QuestRow key={q.id} quest={q} compact onClaim={() => router.push('/quests')} />
        ))}
      </View>
    </View>
  );

  return (
    <Screen frame="wide" header={<KidHeader />} bottomInset={TAB_BAR_SPACE}>
      {twoColumns ? (
        <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            {hero}
            {review}
            {continueBlock}
          </View>
          <View style={{ flex: 1 }}>{quests}</View>
        </View>
      ) : (
        <>
          {hero}
          {review}
          {continueBlock}
          {quests}
        </>
      )}

      <View>
        <SectionLabel right={<Txt variant="small">{standard.title}</Txt>}>Subjects</SectionLabel>
        <Grid minItemWidth={150} maxColumns={4}>
          {standard.subjects.map((s) => {
            const sp = subjectProgress(s, p);
            return <SubjectCard key={s.id} subject={s} ratio={sp.ratio} mastered={sp.mastered} onPress={() => router.push(`/subject/${standard.id}/${s.id}`)} />;
          })}
        </Grid>
      </View>

      {standard.arcade.length > 0 && (
        <View>
          <SectionLabel>⚡ Arcade · time attack</SectionLabel>
          <HScroll gap={12} paddingVertical={4}>
            {standard.arcade.map((g) => {
              const locked = g.price > 0 && !p.inventory.includes(`arcade:${g.id}`);
              return (
                <ArcadeCard key={g.id} game={g} locked={locked} best={p.timeAttackBest[g.quiz.id]} onPress={() => router.push(locked ? '/shop?tab=games' : `/quiz/${g.quiz.id}`)} />
              );
            })}
          </HScroll>
        </View>
      )}

      {standard.subjects.length === 0 && (
        <Chunky innerStyle={{ padding: 16 }}>
          <Txt>Content for {standard.title} is coming soon.</Txt>
        </Chunky>
      )}
    </Screen>
  );
}
