import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { View } from 'react-native';
import { Avatar } from '@/components/avatar/Avatar';
import { MascotSays } from '@/components/mascot/MascotSays';
import { Button, Grid, PressChunky, Screen, Txt } from '@/components/ui';
import { levelFromXp } from '@/features/gamify/xp';
import { useT } from '@/i18n';
import { useApp } from '@/store/app';
import { colors } from '@/theme';

export default function Profiles() {
  const profiles = useApp((s) => s.profiles);
  const progress = useApp((s) => s.progress);
  const select = useApp((s) => s.selectProfile);
  const t = useT();
  return (
    <Screen frame="wide">
      <View style={{ paddingTop: 24, gap: 22 }}>
        <MascotSays text={t('profiles.who')} mood="wave" size={100} />
        <Grid minItemWidth={150} maxColumns={4} gap={14}>
          {profiles.map((p) => (
            <View key={p.id} style={{ flex: 1 }}>
              <PressChunky
                onPress={() => {
                  select(p.id);
                  router.replace('/home');
                }}
                innerStyle={{ flex: 1, padding: 16, alignItems: 'center', gap: 8 }}
                accessibilityLabel={p.name}
                style={{ flex: 1 }}
              >
                <Avatar config={p.avatar} size={96} />
                <Txt variant="title">{p.name}</Txt>
                <Txt variant="small">
                  {t('profiles.meta', p.level, levelFromXp(progress[p.id]?.xp ?? 0))}
                </Txt>
              </PressChunky>
            </View>
          ))}
          <View key="add" style={{ flex: 1 }}>
            <PressChunky
              style={{ flex: 1 }}
              onPress={() => router.push('/parent?next=add-child')}
              bg={colors.sand}
              innerStyle={{ flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 172 }}
              accessibilityLabel={t('profiles.add')}
            >
              <View
                style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={30} color={colors.ink} strokeWidth={3} />
              </View>
              <Txt variant="subtitle">{t('profiles.add')}</Txt>
            </PressChunky>
          </View>
        </Grid>
        <Button label={t('profiles.parentZone')} tone="paper" onPress={() => router.push('/parent')} />
      </View>
    </Screen>
  );
}
