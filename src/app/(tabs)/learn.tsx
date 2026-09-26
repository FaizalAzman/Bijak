import { router } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { KidHeader } from '@/components/gamify/KidHeader';
import { TAB_BAR_SPACE } from '@/components/gamify/TabBar';
import { Chip, Chunky, PressChunky, ProgressBar, Screen, SectionLabel, Tag, Txt } from '@/components/ui';
import { useContentIndex } from '@/features/content/registry';
import { subjectProgress, topicStatus } from '@/features/progress/selectors';
import { useActiveProfile, useProgress } from '@/store/app';
import { accent, colors, fonts } from '@/theme';

export default function Learn() {
  const profile = useActiveProfile();
  const p = useProgress();
  const index = useContentIndex();
  const [stdId, setStdId] = useState(() => (profile ? index.standardByLevel(profile.level)?.id : undefined) ?? index.standards[0]?.id);
  const [query, setQuery] = useState('');
  const standard = index.standard(stdId) ?? index.standards[0];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return index.standards.flatMap((s) =>
      s.subjects.flatMap((sub) =>
        sub.topics.filter((t) => [t.title, t.titleAlt, sub.name, ...t.objectives.map((o) => o.text)].some((x) => x?.toLowerCase().includes(q))).map((t) => ({ std: s, sub, t })),
      ),
    );
  }, [query, index]);

  if (!standard) return null;
  return (
    <Screen header={<KidHeader title="Learn" />} bottomInset={TAB_BAR_SPACE}>
      <Txt variant="body" style={{ color: colors.muted, marginBottom: 12 }}>
        Every KSSR topic, lesson and quiz, by standard.
      </Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 18 }}>
        {index.standards.map((s) => (
          <Chip key={s.id} label={s.title} count={s.subjects.reduce((n, x) => n + x.topics.length, 0)} selected={s.id === standard.id} onPress={() => setStdId(s.id)} />
        ))}
      </ScrollView>

      <Chunky style={{ marginTop: 16 }} depth={3} innerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 }}>
        <Search size={18} color={colors.muted} strokeWidth={2.5} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search topics… e.g. fractions"
          placeholderTextColor={colors.muted}
          style={{ flex: 1, paddingVertical: 13, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }}
        />
      </Chunky>

      {query.trim() ? (
        <View style={{ marginTop: 14, gap: 10 }}>
          <SectionLabel>{`${results.length} result${results.length === 1 ? '' : 's'}`}</SectionLabel>
          {results.map(({ std, sub, t }) => (
            <PressChunky key={t.id} depth={3} onPress={() => router.push(`/topic/${t.id}`)} innerStyle={{ padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Txt style={{ fontSize: 26 }}>{t.emoji}</Txt>
              <View style={{ flex: 1 }}>
                <Txt variant="subtitle">{t.title}</Txt>
                <Txt variant="small">
                  {std.title} · {sub.name}
                </Txt>
              </View>
              <ChevronRight size={20} color={colors.ink} />
            </PressChunky>
          ))}
        </View>
      ) : (
        <View style={{ marginTop: 6 }}>
          <SectionLabel right={<Txt variant="small">{standard.titleAlt}</Txt>}>Subjects</SectionLabel>
          {standard.subjects.length === 0 && (
            <Chunky innerStyle={{ padding: 18 }}>
              <Txt variant="subtitle">Coming soon ✨</Txt>
              <Txt variant="small">New lessons for {standard.title} will download automatically.</Txt>
            </Chunky>
          )}
          <View style={{ gap: 14 }}>
            {standard.subjects.map((s, i) => {
              const sp = subjectProgress(s, p);
              const a = accent(s.color);
              const started = s.topics.filter((t) => topicStatus(t, p).stars > 0).length;
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
                        label={sp.mastered === sp.total && sp.total > 0 ? 'Mastered' : started ? 'In progress' : 'New'}
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
          </View>
        </View>
      )}
    </Screen>
  );
}
