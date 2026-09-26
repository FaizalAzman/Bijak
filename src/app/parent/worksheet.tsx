import { useLocalSearchParams } from 'expo-router';
import { Printer, RefreshCw, Share2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { toast } from '@/components/gamify/Toaster';
import { Button, Chip, Chunky, FrameRow, HScroll, Screen, SectionLabel, Toggle, TopBar, Txt } from '@/components/ui';
import { useContentIndex } from '@/features/content/registry';
import { weakTopics } from '@/features/insights/insights';
import { useRequireParent } from '@/features/profile/parentSession';
import { useLayout } from '@/hooks/useLayout';
import { A4, buildWorksheet, SHEET_SIZES, sheetSizes, worksheetHtml } from '@/features/worksheet/sheet';
import { useT } from '@/i18n';
import { dayKey } from '@/lib/date';
import { printHtml, sharePdf } from '@/lib/print';
import { telemetry } from '@/lib/telemetry';
import { emptyProgress, useApp } from '@/store/app';
import { colors } from '@/theme';

/** The "practise next" choice: the child's weakest topics together. */
const WEAK = 'weak';
const PREVIEW = 5;

/** Printable practice sheets (a PDF to print or share), in the child's school language. */
export default function WorksheetScreen() {
  const ok = useRequireParent();
  const params = useLocalSearchParams<{ child?: string; topic?: string }>();
  const profiles = useApp((s) => s.profiles);
  const progress = useApp((s) => s.progress);
  const [childId, setChildId] = useState(params.child);
  const child = profiles.find((p) => p.id === childId) ?? profiles[0];
  const index = useContentIndex(child?.medium);
  const t = useT();
  // On the narrowest phones the two footer buttons drop their icons so the labels fit.
  const roomy = useLayout().innerWidth >= 320;
  const [choice, setChoice] = useState(params.topic);
  const [subjectId, setSubjectId] = useState<string>();
  const [count, setCount] = useState<number>(SHEET_SIZES[0]);
  const [answers, setAnswers] = useState(true);
  // Each "New questions" tap draws a fresh set (generated quizzes never repeat exactly).
  const [seed, setSeed] = useState(() => Date.now());

  const standard = child ? index.standardByLevel(child.level) : undefined;
  const subjects = useMemo(
    () => (standard?.subjects ?? []).map((s) => ({ ...s, topics: s.topics.filter((topic) => topic.quizzes.some((q) => q.mode !== 'timeAttack')) })).filter((s) => s.topics.length),
    [standard],
  );
  const weak = useMemo(() => (child ? weakTopics(progress[child.id] ?? emptyProgress(), index, 3) : []), [child, progress, index]);
  // Start with what the class is on at school, else the first topic.
  const fallback = subjects.map((s) => child?.schoolTopics?.[s.id]).find(Boolean) ?? subjects[0]?.topics[0]?.id;
  const selected = choice === WEAK && !weak.length ? fallback : (choice ?? fallback);
  // One subject's topics at a time: the one picked, else the one holding the chosen topic.
  const subject = subjects.find((s) => s.id === subjectId) ?? subjects.find((s) => s.topics.some((topic) => topic.id === selected)) ?? subjects[0];

  // Every question the topic has, shuffled; the sheet takes the first `size` (so changing the
  // size keeps the questions already chosen).
  const full = useMemo(() => {
    if (!child) return null;
    const topicIds = selected === WEAK ? weak.map((w) => w.topicId) : selected ? [selected] : [];
    return buildWorksheet(index, { child: child.name, topicIds, count: Number.POSITIVE_INFINITY, answers, seed, day: dayKey() });
  }, [child, index, selected, weak, answers, seed]);
  const sizes = sheetSizes(full?.available ?? 0);
  const size = sizes.filter((n) => n <= count).at(-1) ?? sizes[0];
  const sheet = full && { ...full, questions: full.questions.slice(0, size) };

  const run = async (how: 'print' | 'share') => {
    if (!sheet) return;
    try {
      const html = worksheetHtml(sheet);
      if (how === 'print') await printHtml(html, A4);
      else await sharePdf(html, A4, sheet.title);
      telemetry.event('worksheet', { how, questions: sheet.questions.length });
    } catch (e) {
      telemetry.error(e, { where: 'worksheet' });
      toast({ emoji: '⚠️', title: t('sheet.failed') });
    }
  };

  if (!ok) return null;
  if (!child || !standard) {
    return (
      <Screen header={<TopBar title={t('sheet.title')} />}>
        <Txt variant="body">{t('school.noLearner')}</Txt>
      </Screen>
    );
  }
  return (
    <Screen
      header={<TopBar title={t('sheet.title')} />}
      footer={
        <FrameRow style={{ flexDirection: 'row', gap: 10, paddingVertical: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label={t('sheet.print')} tone="lime" full icon={roomy ? <Printer size={18} color={colors.ink} /> : undefined} disabled={!sheet} onPress={() => run('print')} testID="sheet-print" />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={t('sheet.share')} tone="paper" full icon={roomy ? <Share2 size={18} color={colors.ink} /> : undefined} disabled={!sheet} onPress={() => run('share')} testID="sheet-share" />
          </View>
        </FrameRow>
      }
    >
      {profiles.length > 1 && (
        <View style={{ paddingBottom: 14 }}>
          <HScroll>
            {profiles.map((c) => (
              <Chip key={c.id} label={c.name} selected={c.id === child.id} onPress={() => setChildId(c.id)} />
            ))}
          </HScroll>
        </View>
      )}
      <Txt variant="small">{t('sheet.intro')}</Txt>

      <SectionLabel>{t('sheet.topic')}</SectionLabel>
      <View style={{ gap: 12 }}>
        {weak.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label={`💡 ${t('sheet.practiseNext')}`} selected={selected === WEAK} onPress={() => setChoice(WEAK)} />
          </View>
        )}
        <HScroll>
          {subjects.map((s) => (
            <Chip
              key={s.id}
              label={`${s.emoji} ${s.name}`}
              selected={s.id === subject?.id}
              onPress={() => {
                setSubjectId(s.id);
                setChoice(child.schoolTopics?.[s.id] ?? s.topics[0].id);
              }}
            />
          ))}
        </HScroll>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {subject?.topics.map((topic) => (
            <Chip key={topic.id} label={`${topic.emoji} ${topic.title}`} selected={selected === topic.id} onPress={() => setChoice(topic.id)} />
          ))}
        </View>
      </View>

      <SectionLabel>{t('sheet.count')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {sizes.map((n) => (
            <Chip key={n} label={(SHEET_SIZES as readonly number[]).includes(n) ? String(n) : t('sheet.all', n)} selected={size === n} onPress={() => setCount(n)} />
          ))}
        </View>
        <Toggle label={t('sheet.answers')} value={answers} onChange={setAnswers} />
      </Chunky>

      <SectionLabel right={<Button label={t('sheet.shuffle')} tone="paper" size="sm" icon={<RefreshCw size={14} color={colors.ink} />} onPress={() => setSeed((s) => s + 1)} testID="sheet-shuffle" />}>
        {t('sheet.preview')}
      </SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 6 }}>
        {sheet ? (
          <>
            <Txt variant="subtitle">{sheet.title}</Txt>
            <Txt variant="small">{`${sheet.subtitle} · ${t('common.questions', sheet.questions.length)}`}</Txt>
            {sheet.questions.slice(0, PREVIEW).map((q, i) => (
              <Txt key={`${i}-${q.id}`} variant="body" numberOfLines={2} testID={`sheet-q-${i}`}>
                {`${i + 1}. ${q.visual ? `${q.visual} ` : ''}${q.prompt}`}
              </Txt>
            ))}
            {sheet.questions.length > PREVIEW ? <Txt variant="small">{t('sheet.more', sheet.questions.length - PREVIEW)}</Txt> : null}
          </>
        ) : (
          <Txt variant="small">{t('sheet.empty')}</Txt>
        )}
      </Chunky>
    </Screen>
  );
}
