import { View } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '@/components/avatar/Avatar';
import { AvatarBasics } from '@/components/avatar/AvatarBasics';
import { Button, Chunky, PressChunky, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { itemName, SHOP, SLOT_KEY, type Slot } from '@/features/gamify/shop';
import { useT } from '@/i18n';
import { useActiveProfile, useApp, useProgress } from '@/store/app';
import { colors } from '@/theme';

const SLOTS: Slot[] = ['outfit', 'hat', 'glasses', 'bg', 'pet'];

export default function AvatarScreen() {
  const profile = useActiveProfile();
  const p = useProgress();
  const setAvatar = useApp((s) => s.setAvatar);
  const equip = useApp((s) => s.equip);
  const t = useT();
  if (!profile) return null;
  return (
    <Screen header={<TopBar title={t('avatar.title')} />}>
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <View>
          <Avatar config={profile.avatar} size={170} mood="excited" />
        </View>
      </View>
      <Chunky innerStyle={{ padding: 16 }}>
        <AvatarBasics value={profile.avatar} onChange={setAvatar} />
      </Chunky>
      {SLOTS.map((slot) => {
        const owned = SHOP.filter((i) => i.slot === slot && p.inventory.includes(i.id));
        const optional = slot === 'hat' || slot === 'glasses' || slot === 'pet';
        const slotName = t(SLOT_KEY[slot]);
        return (
          <View key={slot}>
            <SectionLabel>{slotName}</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {optional && (
                <PressChunky
                  depth={3}
                  onPress={() => equip(slot, undefined)}
                  bg={!profile.avatar[slot] ? colors.lime : colors.paper}
                  innerStyle={{ width: 70, height: 70, alignItems: 'center', justifyContent: 'center' }}
                  accessibilityLabel={t('avatar.noItem', slotName)}
                >
                  <Txt variant="small" style={{ color: colors.ink }}>
                    {t('common.none')}
                  </Txt>
                </PressChunky>
              )}
              {owned.map((i) => (
                <PressChunky
                  key={i.id}
                  depth={3}
                  onPress={() => equip(slot, i.id)}
                  bg={profile.avatar[slot] === i.id ? colors.lime : colors.paper}
                  innerStyle={{ width: 70, height: 70, alignItems: 'center', justifyContent: 'center' }}
                  accessibilityLabel={itemName(i, t.lang)}
                >
                  <Txt style={{ fontSize: 30 }}>{i.emoji}</Txt>
                </PressChunky>
              ))}
              {owned.length === 0 && (
                <Txt variant="small" style={{ alignSelf: 'center' }}>
                  {t('avatar.buyIn', slotName)}
                </Txt>
              )}
            </View>
          </View>
        );
      })}
      <View style={{ marginTop: 24 }}>
        <Button label={t('avatar.visitShop')} tone="sun" full onPress={() => router.push('/shop')} />
      </View>
    </Screen>
  );
}
