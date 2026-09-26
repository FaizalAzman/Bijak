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
import { useChildContent } from '@/hooks/useChildContent';
import { nextTopic, subjectProgress, topicStatus } from '@/features/progress/selectors';
import { dueCards } from '@/features/srs/srs';
import { useLayout } from '@/hooks/useLayout';
import { useNow } from '@/hooks/useNow';
import { dayKey } from '@/lib/date';
import { streakStatus } from '@/features/gamify/streak';
import { standardName, useT } from '@/i18n';
import { liveStreak, useActiveProfile, useProgress, useRestDays } from '@/store/app';
import { accent, colors } from '@/theme';

export default function Home() {
  const profile = useActiveProfile();
  const p = useProgress();
  const index = useChildContent();
  const standard = profile ? (index.standardByLevel(profile.level) ?? index.standards[0]) : undefined;
  const now = useNow();
  const layout = useLayout('wide');
  const due = useMemo(() => dueCards(p.srs, now, 50).length, [p.srs, now]);
  const schoolTopics = profile?.schoolTopics;
  const next = useMemo(() => nextTopic(standard, p, schoolTopics), [standard, p, schoolTopics]);
  const today = dayKey();
  const restDays = useRestDays();
  const studiedToday = p.streak.lastDay === today;
  const streak = liveStreak(p, today, restDays);
  const status = streakStatus(p.streak, today, restDays);
  const allQuestsDone = p.quests.list.length > 0 && p.quests.list.every((q) => q.claimed);
  const t = useT();

  const mascot: { text: string; mood: KancilMood } = allQuestsDone
    ? { text: t('home.mascot.allDone'), mood: 'cheer' }
    : due > 0
      ? { text: t('home.mascot.review', due), mood: 'think' }
      : status === 'atRisk'
        ? { text: t('home.mascot.atRisk', streak), mood: 'wow' }
        : status === 'rest'
          ? { text: t('home.mascot.rest'), mood: 'happy' }
          : status === 'protected'
            ? { text: t('home.mascot.protected', streak), mood: 'think' }
            : studiedToday
              ? { text: t('home.mascot.studied'), mood: 'happy' }
              : { text: t('home.mascot.hello'), mood: 'wave' };

  if (!profile || !standard) return null;
  const twoColumns = layout.innerWidth >= 720;
  // What the class is on at school (pinned by a parent); the first unfinished one leads "Continue".
  const atSchool = standard.subjects.flatMap((subject) => subject.topics.filter((t) => t.id === schoolTopics?.[subject.id]).map((topic) => ({ subject, topic })));
  const nextIsSchool = !!next && atSchool.some((x) => x.topic.id === next.topic.id);
  const alsoAtSchool = atSchool.filter((x) => x.topic.id !== next?.topic.id);
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
            accessibilityLabel={t('home.review.a11y')}
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
              <Txt variant="subtitle">{t('home.review.title')}</Txt>
              <Txt variant="small">{t('home.review.sub', due)}</Txt>
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
          <SectionLabel>{t('home.continue')}</SectionLabel>
          <PressChunky
            onPress={() => router.push(`/topic/${next.topic.id}`)}
            bg={accent(next.subject.color).strong}
            innerStyle={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
            accessibilityLabel={t('home.continue.a11y', next.topic.title)}
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
                {nextIsSchool ? t('home.atSchoolSubject', next.subject.name) : next.subject.name}
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
      {alsoAtSchool.length > 0 && (
        <View>
          <SectionLabel>{nextIsSchool ? t('home.alsoAtSchool') : t('home.atSchool')}</SectionLabel>
          <View style={{ gap: 10 }}>
            {alsoAtSchool.map(({ subject, topic }) => {
              const st = topicStatus(topic, p);
              return (
                <PressChunky
                  key={topic.id}
                  depth={3}
                  onPress={() => router.push(`/topic/${topic.id}`)}
                  bg={accent(subject.color).soft}
                  innerStyle={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  accessibilityLabel={t('home.atSchool.a11y', topic.title)}
                >
                  <Txt style={{ fontSize: 26 }}>{topic.emoji}</Txt>
                  <View style={{ flex: 1 }}>
                    <Txt variant="subtitle" numberOfLines={1}>
                      {topic.title}
                    </Txt>
                    <Txt variant="small">
                      🏫 {subject.name} · {st.mastered ? t('common.masteredTick') : `${'★'.repeat(st.stars)}${'☆'.repeat(3 - st.stars)}`}
                    </Txt>
                  </View>
                  <ArrowRight size={20} color={colors.ink} strokeWidth={3} />
                </PressChunky>
              );
            })}
          </View>
        </View>
      )}
    </>
  );
  const quests = (
    <View>
      <SectionLabel
        right={
          <Txt variant="small" onPress={() => router.push('/quests')} style={{ color: colors.grape }}>
            {t('home.seeAll')}
          </Txt>
        }
      >
        {t('home.dailyQuests')}
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
        <SectionLabel right={<Txt variant="small">{standardName(standard, t.lang)}</Txt>}>{t('home.subjects')}</SectionLabel>
        <Grid minItemWidth={150} maxColumns={4}>
          {standard.subjects.map((s) => {
            const sp = subjectProgress(s, p);
            return <SubjectCard key={s.id} subject={s} ratio={sp.ratio} mastered={sp.mastered} onPress={() => router.push(`/subject/${standard.id}/${s.id}`)} />;
          })}
        </Grid>
      </View>

      {standard.arcade.length > 0 && (
        <View>
          <SectionLabel>{t('home.arcade')}</SectionLabel>
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
          <Txt>{t('home.comingSoon', standardName(standard, t.lang))}</Txt>
        </Chunky>
      )}
    </Screen>
  );
}
