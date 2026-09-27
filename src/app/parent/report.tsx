import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { Button, Chip, Chunky, Grid, HScroll, Screen, SectionLabel, Tag, TopBar, Txt } from '@/components/ui';
import { useContentIndex } from '@/features/content/registry';
import { minutesLabel, rangeLabel, shareText, stars, weeklyReport } from '@/features/insights/weekly';
import { useRequireParent } from '@/features/profile/parentSession';
import { useT } from '@/i18n';
import { telemetry } from '@/lib/telemetry';
import { emptyProgress, useApp, useRestDays } from '@/store/app';
import { colors } from '@/theme';

function Stat({ label, value, before, bg }: { label: string; value: string; before: string; bg: string }) {
  const t = useT();
  return (
    <Chunky bg={bg} depth={3} style={{ flex: 1 }} innerStyle={{ padding: 12, gap: 2 }}>
      <Txt variant="label" style={{ color: colors.ink }}>
        {label}
      </Txt>
      <Txt variant="hero" style={{ fontSize: 24, lineHeight: 30 }}>
        {value}
      </Txt>
      <Txt variant="small">{t('report.lastWeek', before)}</Txt>
    </Chunky>
  );
}

/** The weekly report: this week at a glance, and a message to share on WhatsApp. */
export default function WeeklyReportScreen() {
  const ok = useRequireParent();
  const params = useLocalSearchParams<{ child?: string }>();
  const profiles = useApp((s) => s.profiles);
  const progress = useApp((s) => s.progress);
  const restDays = useRestDays();
  const [childId, setChildId] = useState(params.child);
  const child = profiles.find((p) => p.id === childId) ?? profiles[0];
  const index = useContentIndex(child?.medium);
  const p = (child && progress[child.id]) || emptyProgress();
  const t = useT();
  const lang = t.lang;
  const report = useMemo(() => (child ? weeklyReport(child, p, index, undefined, restDays, lang) : null), [child, p, index, restDays, lang]);
  if (!ok) return null;
  if (!child || !report) {
    return (
      <Screen header={<TopBar title={t('report.title')} />}>
        <Txt variant="body">{t('report.addLearner')}</Txt>
      </Screen>
    );
  }
  const week = report.thisWeek;
  const last = report.lastWeek;
  const text = shareText(report, lang);
  const share = async (how: 'whatsapp' | 'other') => {
    try {
      if (how === 'whatsapp') await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
      else await Share.share({ message: text });
      telemetry.event('report_shared', { how });
    } catch (e) {
      telemetry.error(e, { where: 'report-share' });
    }
  };

  return (
    <Screen frame="wide" header={<TopBar title={t('report.title')} />}>
      {profiles.length > 1 && (
        <View style={{ paddingBottom: 14 }}>
          <HScroll>
            {profiles.map((c) => (
              <Chip key={c.id} label={c.name} selected={c.id === child.id} onPress={() => setChildId(c.id)} />
            ))}
          </HScroll>
        </View>
      )}
      <Txt variant="display">{t('report.week', report.name)}</Txt>
      <Txt variant="small" style={{ marginBottom: 12 }}>
        {rangeLabel(report.from, report.to, lang)}
      </Txt>

      <Grid minItemWidth={140} maxColumns={4} gap={10}>
        <Stat key="time" label={t('report.time')} value={minutesLabel(week.minutes, lang)} before={minutesLabel(last.minutes, lang)} bg={colors['grape-soft']} />
        <Stat key="days" label={t('report.days')} value={`${week.activeDays} / 7`} before={`${last.activeDays} / 7`} bg={colors['sky-soft']} />
        <Stat key="quizzes" label={t('report.quizzes')} value={String(week.quizzes)} before={String(last.quizzes)} bg={colors['sun-soft']} />
        <Stat key="accuracy" label={t('report.correct')} value={week.accuracy === null ? '–' : `${week.accuracy}%`} before={last.accuracy === null ? '–' : `${last.accuracy}%`} bg={colors['mint-soft']} />
      </Grid>
      <Txt variant="subtitle" style={{ marginTop: 12 }}>
        {report.streak > 0 ? t('report.streak', report.streak, report.bestStreak) : t('report.bestSoFar', report.bestStreak)}
      </Txt>

      <SectionLabel>{t('report.mastered')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 8 }}>
        {report.mastered.length === 0 ? (
          <Txt variant="small">{t('report.noMastered')}</Txt>
        ) : (
          report.mastered.map((m) => <Txt key={m.topicId} variant="subtitle">{`${m.emoji} ${m.title} · ${m.subject}`}</Txt>)
        )}
        {report.badges.length > 0 && <Txt variant="small">{t('report.newBadges', report.badges.map((b) => `${b.emoji} ${b.title}`).join(', '))}</Txt>}
      </Chunky>

      <SectionLabel>{t('report.atSchool')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 8 }}>
        {report.atSchool.length === 0 ? (
          <Txt variant="small">{t('report.tellBijak')}</Txt>
        ) : (
          report.atSchool.map((s) => (
            <View key={s.subject} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt variant="subtitle" style={{ flex: 1 }}>{`${s.subject}: ${s.title}`}</Txt>
              <Tag label={s.mastered ? t('common.masteredTick') : stars(s.stars)} bg={s.mastered ? colors['mint-soft'] : colors['sun-soft']} />
            </View>
          ))
        )}
        <Button label={t('children.setTopics')} tone="paper" size="sm" onPress={() => router.push(`/parent/school?child=${child.id}`)} />
      </Chunky>

      {report.subjects.length > 0 && (
        <>
          <SectionLabel>{t('report.timeBySubject')}</SectionLabel>
          <Chunky depth={3} innerStyle={{ padding: 14, gap: 6 }}>
            {report.subjects.map((s) => (
              <Txt key={s.subject} variant="body">{`${s.emoji} ${s.subject} · ${minutesLabel(s.minutes, lang)}`}</Txt>
            ))}
          </Chunky>
        </>
      )}

      <SectionLabel>{t('report.practise')}</SectionLabel>
      <View style={{ gap: 10 }}>
        {report.practise.length === 0 ? (
          <Chunky depth={3} bg={colors['mint-soft']} innerStyle={{ padding: 14 }}>
            <Txt variant="small">{t('report.nothing')}</Txt>
          </Chunky>
        ) : (
          report.practise.map((w) => (
            <Chunky key={w.topicId} depth={3} innerStyle={{ padding: 14, gap: 6 }}>
              <Txt variant="subtitle">{`${w.subjectEmoji} ${w.title} · ${t('report.pctCorrect', w.accuracy)}`}</Txt>
              {w.activity ? <Txt variant="small">{t('report.tryAtHome', w.activity)}</Txt> : null}
              <Button label={t('report.printSheet')} tone="paper" size="sm" onPress={() => router.push(`/parent/worksheet?child=${child.id}&topic=${w.topicId}`)} />
            </Chunky>
          ))
        )}
      </View>

      <SectionLabel>{t('report.share')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 12 }}>
        <Txt variant="small" testID="share-preview">
          {text}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Button label={t('report.whatsapp')} tone="lime" onPress={() => share('whatsapp')} />
          <Button label={t('report.shareOther')} tone="paper" onPress={() => share('other')} />
        </View>
      </Chunky>
    </Screen>
  );
}
