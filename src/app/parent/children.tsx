import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { Avatar } from '@/components/avatar/Avatar';
import { MediumPicker } from '@/components/parent/MediumPicker';
import { Button, Chip, Chunky, Field, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { getContentIndex, useContentIndex } from '@/features/content/registry';
import { useRequireParent } from '@/features/profile/parentSession';
import { currentT, useT } from '@/i18n';
import { useApp } from '@/store/app';
import type { Profile } from '@/store/types';

function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  const t = currentT();
  Alert.alert(title, message, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.yes'), style: 'destructive', onPress: onYes },
  ]);
}

/** "Matematik: Pecahan · Sains: Tumbuhan" — in the child's teaching language. */
function schoolSummary(p: Profile): string {
  const std = getContentIndex(p.medium).standardByLevel(p.level);
  return (std?.subjects ?? [])
    .flatMap((s) => s.topics.filter((t) => t.id === p.schoolTopics?.[s.id]).map((t) => `${s.name}: ${t.title}`))
    .join(' · ');
}

export default function Children() {
  const ok = useRequireParent();
  const profiles = useApp((s) => s.profiles);
  const update = useApp((s) => s.updateProfile);
  const remove = useApp((s) => s.removeProfile);
  const reset = useApp((s) => s.resetProgress);
  const index = useContentIndex();
  const [names, setNames] = useState<Record<string, string>>({});
  const t = useT();
  if (!ok) return null;
  return (
    <Screen header={<TopBar title={t('dash.children')} />}>
      <View style={{ gap: 16 }}>
        {profiles.map((p) => (
          <Chunky key={p.id} innerStyle={{ padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar config={p.avatar} size={56} />
              <View style={{ flex: 1 }}>
                <Field
                  accessibilityLabel={t('children.nameA11y', p.name)}
                  value={names[p.id] ?? p.name}
                  onChangeText={(name) => setNames((n) => ({ ...n, [p.id]: name }))}
                  onBlur={() => names[p.id]?.trim() && update(p.id, { name: names[p.id].trim() })}
                />
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Txt variant="label">{t('children.standard')}</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {index.standards.map((s) => (
                  <Chip key={s.id} label={String(s.level)} selected={p.level === s.level} onPress={() => update(p.id, { level: s.level })} />
                ))}
              </View>
            </View>
            <MediumPicker value={p.medium ?? 'en'} onChange={(lang) => update(p.id, { medium: lang })} />
            <View style={{ gap: 6 }}>
              <Txt variant="label">{t('children.atSchool')}</Txt>
              <Txt variant="small" testID={`school-${p.id}`}>
                {schoolSummary(p) || t('children.notSet')}
              </Txt>
              <Button label={t('children.setTopics')} tone="paper" size="sm" onPress={() => router.push(`/parent/school?child=${p.id}`)} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label={t('children.reset')}
                tone="paper"
                size="sm"
                onPress={() => confirm(t('children.resetQ'), t('children.resetMsg', p.name), () => reset(p.id))}
              />
              <Button
                label={t('children.remove')}
                tone="berry"
                size="sm"
                onPress={() => confirm(t('children.removeQ'), t('children.removeMsg', p.name), () => remove(p.id))}
              />
            </View>
          </Chunky>
        ))}
      </View>
      <SectionLabel>{t('children.add')}</SectionLabel>
      <Button label={t('children.addLearner')} tone="lime" full onPress={() => router.push('/onboarding')} />
    </Screen>
  );
}
