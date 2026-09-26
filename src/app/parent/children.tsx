import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { Avatar } from '@/components/avatar/Avatar';
import { MediumPicker } from '@/components/parent/MediumPicker';
import { Button, Chip, Chunky, Field, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { getContentIndex, useContentIndex } from '@/features/content/registry';
import { useRequireParent } from '@/features/profile/parentSession';
import { useApp } from '@/store/app';
import type { Profile } from '@/store/types';

function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Yes', style: 'destructive', onPress: onYes },
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
  if (!ok) return null;
  return (
    <Screen header={<TopBar title="Children" />}>
      <View style={{ gap: 16 }}>
        {profiles.map((p) => (
          <Chunky key={p.id} innerStyle={{ padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar config={p.avatar} size={56} />
              <View style={{ flex: 1 }}>
                <Field
                  accessibilityLabel={`${p.name}'s name`}
                  value={names[p.id] ?? p.name}
                  onChangeText={(t) => setNames((n) => ({ ...n, [p.id]: t }))}
                  onBlur={() => names[p.id]?.trim() && update(p.id, { name: names[p.id].trim() })}
                />
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Txt variant="label">Standard</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {index.standards.map((s) => (
                  <Chip key={s.id} label={String(s.level)} selected={p.level === s.level} onPress={() => update(p.id, { level: s.level })} />
                ))}
              </View>
            </View>
            <MediumPicker value={p.medium ?? 'en'} onChange={(lang) => update(p.id, { medium: lang })} />
            <View style={{ gap: 6 }}>
              <Txt variant="label">At school now</Txt>
              <Txt variant="small" testID={`school-${p.id}`}>
                {schoolSummary(p) || 'Not set yet — tell Bijak which topics the class is on.'}
              </Txt>
              <Button label="Set school topics" tone="paper" size="sm" onPress={() => router.push(`/parent/school?child=${p.id}`)} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label="Reset progress"
                tone="paper"
                size="sm"
                onPress={() => confirm('Reset progress?', `All of ${p.name}'s XP, coins, badges and history will be cleared.`, () => reset(p.id))}
              />
              <Button
                label="Remove"
                tone="berry"
                size="sm"
                onPress={() => confirm('Remove learner?', `${p.name} and all progress will be deleted from this device.`, () => remove(p.id))}
              />
            </View>
          </Chunky>
        ))}
      </View>
      <SectionLabel>Add</SectionLabel>
      <Button label="Add a learner" tone="lime" full onPress={() => router.push('/onboarding')} />
    </Screen>
  );
}
