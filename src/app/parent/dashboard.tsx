import { router } from 'expo-router';
import { Activity, BarChart3, ChevronRight, Download, School, Settings, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Avatar } from '@/components/avatar/Avatar';
import { BarList, ColumnChart } from '@/components/parent/Charts';
import { Chip, Chunky, Grid, HScroll, PressChunky, Screen, SectionLabel, Tag, TopBar, Txt } from '@/components/ui';
import { useContentIndex } from '@/features/content/registry';
import { levelFromXp } from '@/features/gamify/xp';
import { accuracyPerSubject, minutesPerDay, timePerSubject, weakTopics } from '@/features/insights/insights';
import { useRequireParent } from '@/features/profile/parentSession';
import { dueCards } from '@/features/srs/srs';
import { useT } from '@/i18n';
import { formatDuration, pct } from '@/lib/format';
import { dayKey } from '@/lib/date';
import { emptyProgress, liveStreak, useApp, useRestDays } from '@/store/app';
import { colors } from '@/theme';

function Tile({ label, value, sub, bg }: { label: string; value: string; sub?: string; bg: string }) {
  return (
    <Chunky bg={bg} depth={3} style={{ flex: 1 }} innerStyle={{ padding: 12, gap: 2 }}>
      <Txt variant="label" style={{ color: colors.ink }}>
        {label}
      </Txt>
      <Txt variant="hero" style={{ fontSize: 26, lineHeight: 32 }}>
        {value}
      </Txt>
      {sub ? <Txt variant="small">{sub}</Txt> : null}
    </Chunky>
  );
}

function NavRow({ icon, label, sub, onPress }: { icon: React.ReactNode; label: string; sub: string; onPress: () => void }) {
  return (
    <PressChunky onPress={onPress} depth={3} innerStyle={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityLabel={label}>
      {icon}
      <View style={{ flex: 1 }}>
        <Txt variant="subtitle">{label}</Txt>
        <Txt variant="small">{sub}</Txt>
      </View>
      <ChevronRight size={20} color={colors.ink} />
    </PressChunky>
  );
}

/** Module 20 — Parent analytics dashboard. */
export default function ParentDashboard() {
  const ok = useRequireParent();
  const profiles = useApp((s) => s.profiles);
  const progressMap = useApp((s) => s.progress);
  const activeId = useApp((s) => s.activeProfileId);
  const parent = useApp((s) => s.parent);
  const restDays = useRestDays();
  const [childId, setChildId] = useState(activeId ?? profiles[0]?.id);
  const child = profiles.find((p) => p.id === childId) ?? profiles[0];
  const index = useContentIndex(child?.medium);
  const p = (child && progressMap[child.id]) || emptyProgress();
  const t = useT();
  const lang = t.lang;

  const perDay = useMemo(() => minutesPerDay(p, lang), [p, lang]);
  const perSubject = useMemo(() => timePerSubject(p, index, lang), [p, index, lang]);
  const accuracy = useMemo(() => accuracyPerSubject(p, index, lang), [p, index, lang]);
  const weak = useMemo(() => weakTopics(p, index, 5, lang), [p, index, lang]);
  const weekMinutes = perDay.reduce((a, d) => a + d.value, 0);
  const tricky = dueCards(p.srs, Number.MAX_SAFE_INTEGER, 999).length;

  if (!ok) return null;
  return (
    <Screen frame="wide" header={<TopBar title={t('dash.hi', parent?.name ?? t('onboarding.defaultParent'))} close onBack={() => router.replace('/')} />}>
      {profiles.length > 1 && (
        <View style={{ paddingBottom: 14 }}>
          <HScroll>
            {profiles.map((c) => (
              <Chip key={c.id} label={c.name} selected={c.id === child?.id} onPress={() => setChildId(c.id)} />
            ))}
          </HScroll>
        </View>
      )}

      {child && (
        <View>
          <Chunky bg={colors.ink} shadowColor={colors.lime} innerStyle={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Avatar config={child.avatar} size={64} />
            <View style={{ flex: 1 }}>
              <Txt variant="display" style={{ color: colors.paper }}>
                {child.name}
              </Txt>
              <Txt variant="small" style={{ color: '#BDB6A6' }}>
                {t('common.standard', child.level)} · {t('common.level', levelFromXp(p.xp))} · {t('common.quizzes', p.totals.quizzes)}
              </Txt>
            </View>
          </Chunky>
        </View>
      )}

      <View style={{ height: 16 }} />
      <Grid minItemWidth={140} maxColumns={4} gap={10}>
        <Tile key="week" label={t('dash.thisWeek')} value={formatDuration(weekMinutes * 60, lang)} sub={t('dash.learningTime')} bg={colors['grape-soft']} />
        <Tile key="accuracy" label={t('dash.accuracy')} value={`${pct(p.totals.correct, p.totals.answered)}%`} sub={t('common.answers', p.totals.answered)} bg={colors['mint-soft']} />
        <Tile key="streak" label={t('dash.streak')} value={`🔥 ${liveStreak(p, dayKey(), restDays)}`} sub={t('dash.best', t('common.days', p.streak.best))} bg={colors['tangerine-soft']} />
        <Tile key="review" label={t('dash.toReview')} value={`🧠 ${tricky}`} sub={t('dash.tricky')} bg={colors['sun-soft']} />
      </Grid>

      <Grid minItemWidth={420} maxColumns={2} gap={16}>
        <View key="minutes">
          <SectionLabel>{t('dash.minutes')}</SectionLabel>
          <Chunky depth={3} innerStyle={{ padding: 14 }}>
            <ColumnChart data={perDay} unit="m" />
            <Txt variant="small" style={{ marginTop: 8 }}>
              {t('dash.tapBar')}
            </Txt>
          </Chunky>
        </View>

        <View key="time">
          <SectionLabel>{t('dash.timePerSubject')}</SectionLabel>
          <Chunky depth={3} innerStyle={{ padding: 14 }}>
            {perSubject.length ? <BarList rows={perSubject} format={(v) => t('common.minutes', v)} /> : <Txt variant="small">{t('dash.noTime')}</Txt>}
          </Chunky>
        </View>

        <View key="accuracy">
          <SectionLabel>{t('dash.accuracyBySubject')}</SectionLabel>
          <Chunky depth={3} innerStyle={{ padding: 14 }}>
            {accuracy.length ? <BarList rows={accuracy} max={100} format={(v) => `${v}%`} /> : <Txt variant="small">{t('dash.noAnswers')}</Txt>}
          </Chunky>
        </View>
      </Grid>

      <SectionLabel>{t('dash.needsAttention')}</SectionLabel>
      {weak.length === 0 ? (
        <Chunky depth={3} bg={colors['mint-soft']} innerStyle={{ padding: 14 }}>
          <Txt variant="subtitle">{t('dash.noWeak')}</Txt>
          <Txt variant="small">{t('dash.noWeakHint')}</Txt>
        </Chunky>
      ) : (
        <View style={{ gap: 12 }}>
          {weak.map((w) => (
            <Chunky key={w.topicId} depth={3} innerStyle={{ padding: 14, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Txt style={{ fontSize: 24 }}>{w.subjectEmoji}</Txt>
                <View style={{ flex: 1 }}>
                  <Txt variant="subtitle">{w.title}</Txt>
                  <Txt variant="small">{t('dash.weakMeta', w.subject, w.answered, w.lapses)}</Txt>
                </View>
                <Tag label={`${w.accuracy}%`} bg={w.accuracy < 50 ? colors['berry-soft'] : colors['sun-soft']} />
              </View>
              {w.objectives.length > 0 && (
                <View style={{ gap: 4 }}>
                  {w.objectives.slice(0, 3).map((o) => (
                    <Txt key={o.code + o.text} variant="small">
                      <Txt variant="mono" style={{ fontSize: 11 }}>
                        {o.code}
                      </Txt>
                      {`  ${o.text}`}
                    </Txt>
                  ))}
                </View>
              )}
              {w.activity ? (
                <View style={{ backgroundColor: colors['sky-soft'], borderRadius: 12, borderWidth: 1.5, borderColor: colors.ink, padding: 10 }}>
                  <Txt variant="label" style={{ color: colors.ink }}>
                    {t('dash.tryAtHome')}
                  </Txt>
                  <Txt variant="body" style={{ fontSize: 14 }}>
                    {w.activity}
                  </Txt>
                </View>
              ) : null}
            </Chunky>
          ))}
        </View>
      )}

      <SectionLabel>{t('dash.recent')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ paddingHorizontal: 14, paddingVertical: 6 }}>
        {p.attempts.length === 0 && (
          <Txt variant="small" style={{ paddingVertical: 8 }}>
            {t('dash.noQuizzes')}
          </Txt>
        )}
        {p.attempts.slice(0, 8).map((a, i) => (
          <View key={a.at + a.quizId} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: colors.line, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Txt variant="subtitle" style={{ fontSize: 14 }} numberOfLines={1}>
                {a.title}
              </Txt>
              <Txt variant="small" style={{ fontSize: 12 }}>
                {new Date(a.at).toLocaleString(t('date.locale'), { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · {formatDuration(a.seconds, lang)}
              </Txt>
            </View>
            <Txt variant="mono" style={{ fontSize: 13 }}>
              {a.mode === 'timeAttack' ? `⚡${a.correct}` : `${a.correct}/${a.total}`}
            </Txt>
          </View>
        ))}
      </Chunky>

      <SectionLabel>{t('dash.manage')}</SectionLabel>
      <View style={{ gap: 10 }}>
        {child && (
          <NavRow
            icon={<BarChart3 size={22} color={colors.ink} />}
            label={t('dash.report')}
            sub={t('dash.report.sub', child.name)}
            onPress={() => router.push(`/parent/report?child=${child.id}`)}
          />
        )}
        {child && (
          <NavRow
            icon={<School size={22} color={colors.ink} />}
            label={t('dash.school')}
            sub={t('dash.school.sub', child.name)}
            onPress={() => router.push(`/parent/school?child=${child.id}`)}
          />
        )}
        <NavRow icon={<Users size={22} color={colors.ink} />} label={t('dash.children')} sub={t('dash.children.sub')} onPress={() => router.push('/parent/children')} />
        <NavRow icon={<Download size={22} color={colors.ink} />} label={t('dash.content')} sub={t('dash.content.sub')} onPress={() => router.push('/parent/content')} />
        <NavRow icon={<Activity size={22} color={colors.ink} />} label={t('dash.health')} sub={t('dash.health.sub')} onPress={() => router.push('/parent/health')} />
        <NavRow icon={<Settings size={22} color={colors.ink} />} label={t('dash.settings')} sub={t('dash.settings.sub')} onPress={() => router.push('/parent/settings')} />
      </View>
    </Screen>
  );
}
