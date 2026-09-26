import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { Button, Chip, Chunky, Grid, HScroll, Screen, SectionLabel, Tag, TopBar, Txt } from '@/components/ui';
import { useContentIndex } from '@/features/content/registry';
import { minutesLabel, rangeLabel, shareText, weeklyReport } from '@/features/insights/weekly';
import { useRequireParent } from '@/features/profile/parentSession';
import { telemetry } from '@/lib/telemetry';
import { emptyProgress, useApp, useRestDays } from '@/store/app';
import { colors } from '@/theme';

function Stat({ label, value, before, bg }: { label: string; value: string; before: string; bg: string }) {
  return (
    <Chunky bg={bg} depth={3} style={{ flex: 1 }} innerStyle={{ padding: 12, gap: 2 }}>
      <Txt variant="label" style={{ color: colors.ink }}>
        {label}
      </Txt>
      <Txt variant="hero" style={{ fontSize: 24, lineHeight: 30 }}>
        {value}
      </Txt>
      <Txt variant="small">{`last week ${before}`}</Txt>
    </Chunky>
  );
}

const stars = (n: number) => `${'★'.repeat(n)}${'☆'.repeat(3 - n)}`;

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
  const report = useMemo(() => (child ? weeklyReport(child, p, index, undefined, restDays) : null), [child, p, index, restDays]);
  if (!ok) return null;
  if (!child || !report) {
    return (
      <Screen header={<TopBar title="Weekly report" />}>
        <Txt variant="body">Add a learner to see their weekly report.</Txt>
      </Screen>
    );
  }
  const t = report.thisWeek;
  const l = report.lastWeek;
  const text = shareText(report);
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
    <Screen frame="wide" header={<TopBar title="Weekly report" />}>
      {profiles.length > 1 && (
        <View style={{ paddingBottom: 14 }}>
          <HScroll>
            {profiles.map((c) => (
              <Chip key={c.id} label={c.name} selected={c.id === child.id} onPress={() => setChildId(c.id)} />
            ))}
          </HScroll>
        </View>
      )}
      <Txt variant="display">{`${report.name}’s week`}</Txt>
      <Txt variant="small" style={{ marginBottom: 12 }}>
        {rangeLabel(report.from, report.to)}
      </Txt>

      <Grid minItemWidth={140} maxColumns={4} gap={10}>
        <Stat key="time" label="Learning time" value={minutesLabel(t.minutes)} before={minutesLabel(l.minutes)} bg={colors['grape-soft']} />
        <Stat key="days" label="Days active" value={`${t.activeDays} / 7`} before={`${l.activeDays} / 7`} bg={colors['sky-soft']} />
        <Stat key="quizzes" label="Quizzes" value={String(t.quizzes)} before={String(l.quizzes)} bg={colors['sun-soft']} />
        <Stat key="accuracy" label="Correct" value={t.accuracy === null ? '–' : `${t.accuracy}%`} before={l.accuracy === null ? '–' : `${l.accuracy}%`} bg={colors['mint-soft']} />
      </Grid>
      <Txt variant="subtitle" style={{ marginTop: 12 }}>
        {report.streak > 0 ? `🔥 ${report.streak}-day streak (best ${report.bestStreak})` : `Best streak so far: ${report.bestStreak} days`}
      </Txt>

      <SectionLabel>Mastered this week</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 8 }}>
        {report.mastered.length === 0 ? (
          <Txt variant="small">No new topics mastered this week. Three stars on every quiz in a topic masters it.</Txt>
        ) : (
          report.mastered.map((m) => <Txt key={m.topicId} variant="subtitle">{`${m.emoji} ${m.title} · ${m.subject}`}</Txt>)
        )}
        {report.badges.length > 0 && <Txt variant="small">{`New badges: ${report.badges.map((b) => `${b.emoji} ${b.title}`).join(', ')}`}</Txt>}
      </Chunky>

      <SectionLabel>At school now</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 8 }}>
        {report.atSchool.length === 0 ? (
          <Txt variant="small">Tell Bijak which topics the class is on, and it will practise them first.</Txt>
        ) : (
          report.atSchool.map((s) => (
            <View key={s.subject} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt variant="subtitle" style={{ flex: 1 }}>{`${s.subject}: ${s.title}`}</Txt>
              <Tag label={s.mastered ? 'Mastered ✓' : stars(s.stars)} bg={s.mastered ? colors['mint-soft'] : colors['sun-soft']} />
            </View>
          ))
        )}
        <Button label="Set school topics" tone="paper" size="sm" onPress={() => router.push(`/parent/school?child=${child.id}`)} />
      </Chunky>

      {report.subjects.length > 0 && (
        <>
          <SectionLabel>Time by subject</SectionLabel>
          <Chunky depth={3} innerStyle={{ padding: 14, gap: 6 }}>
            {report.subjects.map((s) => (
              <Txt key={s.subject} variant="body">{`${s.emoji} ${s.subject} · ${minutesLabel(s.minutes)}`}</Txt>
            ))}
          </Chunky>
        </>
      )}

      <SectionLabel>Practise next</SectionLabel>
      <View style={{ gap: 10 }}>
        {report.practise.length === 0 ? (
          <Chunky depth={3} bg={colors['mint-soft']} innerStyle={{ padding: 14 }}>
            <Txt variant="small">Nothing stands out — keep going! 🎉</Txt>
          </Chunky>
        ) : (
          report.practise.map((w) => (
            <Chunky key={w.topicId} depth={3} innerStyle={{ padding: 14, gap: 6 }}>
              <Txt variant="subtitle">{`${w.subjectEmoji} ${w.title} · ${w.accuracy}% correct`}</Txt>
              {w.activity ? <Txt variant="small">{`Try at home: ${w.activity}`}</Txt> : null}
            </Chunky>
          ))
        )}
      </View>

      <SectionLabel>Share</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 12 }}>
        <Txt variant="small" testID="share-preview">
          {text}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Button label="Share on WhatsApp" tone="lime" onPress={() => share('whatsapp')} />
          <Button label="Share…" tone="paper" onPress={() => share('other')} />
        </View>
      </Chunky>
    </Screen>
  );
}
