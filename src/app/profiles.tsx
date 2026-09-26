import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { Avatar } from '@/components/avatar/Avatar';
import { MascotSays } from '@/components/mascot/MascotSays';
import { Button, PressChunky, Screen, Txt } from '@/components/ui';
import { levelFromXp } from '@/features/gamify/xp';
import { useApp } from '@/store/app';
import { colors } from '@/theme';

export default function Profiles() {
  const profiles = useApp((s) => s.profiles);
  const progress = useApp((s) => s.progress);
  const select = useApp((s) => s.selectProfile);
  return (
    <Screen>
      <View style={{ paddingTop: 24, gap: 22 }}>
        <MascotSays text="Who's learning today?" mood="wave" size={100} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {profiles.map((p, i) => (
            <View key={p.id} style={{ width: '47%', flexGrow: 1 }}>
              <PressChunky
                onPress={() => {
                  select(p.id);
                  router.replace('/home');
                }}
                innerStyle={{ padding: 16, alignItems: 'center', gap: 8 }}
                accessibilityLabel={p.name}
              >
                <Avatar config={p.avatar} size={96} />
                <Txt variant="title">{p.name}</Txt>
                <Txt variant="small">
                  Standard {p.level} · Lv {levelFromXp(progress[p.id]?.xp ?? 0)}
                </Txt>
              </PressChunky>
            </View>
          ))}
          <View style={{ width: '47%', flexGrow: 1 }}>
            <PressChunky
              onPress={() => router.push('/parent?next=add-child')}
              bg={colors.sand}
              innerStyle={{ padding: 16, alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 172 }}
              accessibilityLabel="Add learner"
            >
              <View
                style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={30} color={colors.ink} strokeWidth={3} />
              </View>
              <Txt variant="subtitle">Add learner</Txt>
            </PressChunky>
          </View>
        </View>
        <Button label="Parent zone 🔒" tone="paper" onPress={() => router.push('/parent')} />
      </View>
    </Screen>
  );
}
