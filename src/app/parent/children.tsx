import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { Avatar } from '@/components/avatar/Avatar';
import { Button, Chip, Chunky, Field, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { useContentIndex } from '@/features/content/registry';
import { useRequireParent } from '@/features/profile/parentSession';
import { useApp } from '@/store/app';

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
