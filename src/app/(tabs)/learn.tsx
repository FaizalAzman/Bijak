import { router } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { KidHeader } from '@/components/gamify/KidHeader';
import { TAB_BAR_SPACE } from '@/components/gamify/TabBar';
import { Chip, Chunky, Grid, HScroll, PressChunky, ProgressBar, Screen, SectionLabel, Tag, Txt } from '@/components/ui';
import { useChildContent } from '@/hooks/useChildContent';
import { subjectProgress, topicStatus } from '@/features/progress/selectors';
import { standardName, useT } from '@/i18n';
import { useActiveProfile, useProgress } from '@/store/app';
import { accent, colors, fonts } from '@/theme';

export default function Learn() {
  const profile = useActiveProfile();
  const p = useProgress();
  const index = useChildContent();
  const [stdId, setStdId] = useState(() => (profile ? index.standardByLevel(profile.level)?.id : undefined) ?? index.standards[0]?.id);
  const [query, setQuery] = useState('');
  const t = useT();
  const standard = index.standard(stdId) ?? index.standards[0];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return index.standards.flatMap((s) =>
      s.subjects.flatMap((sub) =>
        sub.topics
          .filter((topic) => [topic.title, topic.titleAlt, sub.name, ...topic.objectives.map((o) => o.text)].some((x) => x?.toLowerCase().includes(q)))
          .map((topic) => ({ std: s, sub, topic })),
      ),
    );
  }, [query, index]);

  if (!standard) return null;
  return (
    <Screen frame="wide" header={<KidHeader title={t('tabs.learn')} />} bottomInset={TAB_BAR_SPACE}>
      <Txt variant="body" style={{ color: colors.muted, marginBottom: 12 }}>
        {t('learn.intro')}
      </Txt>
      <HScroll>
        {index.standards.map((s) => (
          <Chip key={s.id} label={standardName(s, t.lang)} count={s.subjects.reduce((n, x) => n + x.topics.length, 0)} selected={s.id === standard.id} onPress={() => setStdId(s.id)} />
        ))}
      </HScroll>

      <Chunky style={{ marginTop: 16 }} depth={3} innerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 }}>
        <Search size={18} color={colors.muted} strokeWidth={2.5} />
        <TextInput
          accessibilityLabel={t('learn.search')}
          value={query}
          onChangeText={setQuery}
          placeholder={t('learn.searchPlaceholder')}
          placeholderTextColor={colors.muted}
          style={{ flex: 1, paddingVertical: 13, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }}
        />
      </Chunky>

      {query.trim() ? (
        <View style={{ marginTop: 14 }}>
          <SectionLabel>{t('learn.results', results.length)}</SectionLabel>
          <Grid minItemWidth={300} maxColumns={2} gap={10}>
            {results.map(({ std, sub, topic }) => (
              <PressChunky key={topic.id} depth={3} onPress={() => router.push(`/topic/${topic.id}`)} innerStyle={{ padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Txt style={{ fontSize: 26 }}>{topic.emoji}</Txt>
                <View style={{ flex: 1 }}>
                  <Txt variant="subtitle">{topic.title}</Txt>
                  <Txt variant="small">
                    {standardName(std, t.lang)} · {sub.name}
                  </Txt>
                </View>
                <ChevronRight size={20} color={colors.ink} />
              </PressChunky>
            ))}
          </Grid>
        </View>
      ) : (
        <View style={{ marginTop: 6 }}>
          <SectionLabel right={<Txt variant="small">{standardName(standard, t.lang === 'ms' ? 'en' : 'ms')}</Txt>}>{t('home.subjects')}</SectionLabel>
          {standard.subjects.length === 0 && (
            <Chunky innerStyle={{ padding: 18 }}>
              <Txt variant="subtitle">{t('common.comingSoon')}</Txt>
              <Txt variant="small">{t('learn.newSoon', standardName(standard, t.lang))}</Txt>
            </Chunky>
          )}
          <Grid minItemWidth={300} maxColumns={2} gap={14}>
            {standard.subjects.map((s) => {
              const sp = subjectProgress(s, p);
              const a = accent(s.color);
              const started = s.topics.filter((topic) => topicStatus(topic, p).stars > 0).length;
              return (
                <View key={s.id}>
                  <PressChunky onPress={() => router.push(`/subject/${standard.id}/${s.id}`)} innerStyle={{ padding: 14, gap: 12 }} accessibilityLabel={s.name}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 18,
                          backgroundColor: a.strong,
                          borderWidth: 2,
                          borderColor: colors.ink,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Txt style={{ fontSize: 28 }}>{s.emoji}</Txt>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt variant="title">{s.name}</Txt>
                        <Txt variant="small">{s.nameAlt}</Txt>
                      </View>
                      <Tag
                        label={sp.mastered === sp.total && sp.total > 0 ? t('common.mastered') : started ? t('common.inProgress') : t('common.new')}
                        bg={sp.mastered === sp.total && sp.total > 0 ? colors.mint : started ? colors.sun : colors['sky-soft']}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <ProgressBar value={sp.ratio} color={a.strong} height={12} />
                      </View>
                      <Txt variant="mono" style={{ fontSize: 12 }}>
                        {sp.mastered}/{sp.total} ⭐
                      </Txt>
                    </View>
                  </PressChunky>
                </View>
              );
            })}
          </Grid>
        </View>
      )}
    </Screen>
  );
}
