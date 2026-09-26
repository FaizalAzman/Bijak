import { useLocalSearchParams } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Avatar } from '@/components/avatar/Avatar';
import { KidHeader } from '@/components/gamify/KidHeader';
import { TAB_BAR_SPACE } from '@/components/gamify/TabBar';
import { toast } from '@/components/gamify/Toaster';
import { Button, Chip, Chunky, Grid, HScroll, PressChunky, Screen, Txt } from '@/components/ui';
import { useChildContent } from '@/hooks/useChildContent';
import { SHOP, SLOT_LABEL, type ShopItem, type Slot } from '@/features/gamify/shop';
import { levelFromXp } from '@/features/gamify/xp';
import { useLayout } from '@/hooks/useLayout';
import { fx } from '@/lib/feedback';
import { useActiveProfile, useApp, useProgress } from '@/store/app';
import { accent, colors } from '@/theme';

type Tab = Slot | 'games';
const TABS: Tab[] = ['outfit', 'hat', 'glasses', 'bg', 'pet', 'games'];

export default function Shop() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const profile = useActiveProfile();
  const p = useProgress();
  const index = useChildContent();
  const buy = useApp((s) => s.buy);
  const equip = useApp((s) => s.equip);
  const unlockArcade = useApp((s) => s.unlockArcade);
  const [tab, setTab] = useState<Tab>((TABS as string[]).includes(params.tab ?? '') ? (params.tab as Tab) : 'outfit');
  const [preview, setPreview] = useState<ShopItem | null>(null);
  const level = levelFromXp(p.xp);
  const layout = useLayout('wide');
  const games = useMemo(() => index.standards.flatMap((s) => s.arcade.filter((g) => g.price > 0).map((g) => ({ g, std: s }))), [index]);

  if (!profile) return null;
  const previewConfig = preview && preview.slot ? { ...profile.avatar, [preview.slot]: preview.id } : profile.avatar;
  const previewLocked = !!preview?.minLevel && level < preview.minLevel;
  const canAfford = !!preview && p.coins >= preview.price;

  const onItem = (item: ShopItem) => {
    const owned = p.inventory.includes(item.id);
    const equipped = profile.avatar[item.slot] === item.id;
    if (owned) {
      fx.drop();
      // Outfit and background always need a value; accessories can be removed.
      equip(item.slot, equipped && (item.slot === 'hat' || item.slot === 'glasses' || item.slot === 'pet') ? undefined : item.id);
      setPreview(null);
      return;
    }
    setPreview(item);
  };

  const purchase = (item: ShopItem) => {
    if (buy(item.id)) {
      fx.coin();
      equip(item.slot, item.id);
      toast({ emoji: item.emoji ?? '🛍️', title: `${item.name} unlocked!`, subtitle: 'Equipped on your avatar' });
      setPreview(null);
    } else fx.wrong();
  };

  // Wide screens have room beside the avatar; there the actions sit under the text, capped in width.
  const wide = layout.innerWidth >= 560;
  const actions = preview && (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 440, marginTop: wide ? 6 : 0 }}>
      <View style={{ flex: 1 }}>
        <Button
          label={previewLocked ? `Level ${preview.minLevel} needed` : `Buy · ${preview.price} 🪙`}
          tone="lime"
          full
          disabled={previewLocked || !canAfford}
          onPress={() => purchase(preview)}
          testID="buy"
        />
      </View>
      <Button label="Cancel" tone="paper" align="center" onPress={() => setPreview(null)} testID="cancel-preview" />
    </View>
  );

  return (
    <Screen frame="wide" header={<KidHeader title="Shop" />} bottomInset={TAB_BAR_SPACE}>
      <Chunky bg={colors['grape-soft']} innerStyle={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Avatar config={previewConfig} size={layout.isTablet ? 140 : layout.small ? 88 : 110} mood={preview ? 'excited' : 'happy'} />
          <View style={{ flex: 1, gap: 6 }}>
            {preview ? (
              <>
                <Txt variant="label">Trying on</Txt>
                <Txt variant="title" numberOfLines={2}>
                  {preview.name}
                </Txt>
                <Txt variant="small" testID="preview-status">
                  {previewLocked ? `🔒 Unlocks at level ${preview.minLevel}` : canAfford ? `🪙 ${preview.price} coins` : `Need ${preview.price - p.coins} more coins`}
                </Txt>
                {wide && actions}
              </>
            ) : (
              <>
                <Txt variant="label">Your coins</Txt>
                <Txt variant="hero">🪙 {p.coins}</Txt>
                <Txt variant="small">Tap an item to try it on!</Txt>
              </>
            )}
          </View>
        </View>
        {/* On phones the actions get their own full-width row, so Buy is never squeezed beside the avatar. */}
        {!wide && actions}
      </Chunky>

      <HScroll paddingVertical={16}>
        {TABS.map((t) => (
          <Chip key={t} label={t === 'games' ? 'Games' : SLOT_LABEL[t]} selected={tab === t} onPress={() => (setTab(t), setPreview(null))} />
        ))}
      </HScroll>

      {tab === 'games' ? (
        <Grid minItemWidth={300} maxColumns={2}>
          {games.length === 0 && <Txt variant="small">No games to unlock yet.</Txt>}
          {games.map(({ g, std }) => {
            const owned = p.inventory.includes(`arcade:${g.id}`);
            const a = accent(g.color);
            return (
              <Chunky key={g.id} bg={owned ? a.soft : colors.paper} innerStyle={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    backgroundColor: a.strong,
                    borderWidth: 2,
                    borderColor: colors.ink,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Txt style={{ fontSize: 28 }}>{g.emoji}</Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="subtitle">{g.title}</Txt>
                  <Txt variant="small">
                    {std.title} · {g.quiz.seconds}s time attack
                  </Txt>
                </View>
                {owned ? (
                  <Txt variant="small" style={{ color: colors.ink }}>
                    Unlocked ✓
                  </Txt>
                ) : (
                  <Button
                    label={`${g.price} 🪙`}
                    size="sm"
                    tone="lime"
                    align="center"
                    disabled={p.coins < g.price}
                    testID={`unlock-${g.id}`}
                    onPress={() => {
                      if (unlockArcade(g.id)) {
                        fx.coin();
                        toast({ emoji: g.emoji, title: `${g.title} unlocked!`, subtitle: 'Find it in the Arcade on Home' });
                      }
                    }}
                  />
                )}
              </Chunky>
            );
          })}
        </Grid>
      ) : (
        <Grid minItemWidth={140} maxColumns={5}>
          {SHOP.filter((i) => i.slot === tab).map((item) => {
            const owned = p.inventory.includes(item.id);
            const equipped = profile.avatar[item.slot] === item.id;
            const locked = !owned && !!item.minLevel && level < item.minLevel;
            return (
              <View key={item.id}>
                <PressChunky
                  onPress={() => onItem(item)}
                  bg={equipped ? colors.lime : preview?.id === item.id ? colors['sun-soft'] : colors.paper}
                  innerStyle={{ padding: 12, alignItems: 'center', gap: 6, minHeight: 140 }}
                  accessibilityLabel={item.name}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 20,
                      backgroundColor: item.color ?? colors.sand,
                      borderWidth: 2,
                      borderColor: colors.ink,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: locked ? 0.5 : 1,
                    }}
                  >
                    <Txt style={{ fontSize: 32 }}>{item.emoji}</Txt>
                  </View>
                  <Txt variant="subtitle" numberOfLines={1} style={{ fontSize: 14 }}>
                    {item.name}
                  </Txt>
                  {equipped ? (
                    <Txt variant="small" style={{ color: colors.ink }}>
                      Equipped ✓
                    </Txt>
                  ) : owned ? (
                    <Txt variant="small">Tap to wear</Txt>
                  ) : locked ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Lock size={12} color={colors.muted} />
                      <Txt variant="small">Level {item.minLevel}</Txt>
                    </View>
                  ) : (
                    <Txt variant="subtitle" style={{ fontSize: 14 }}>
                      🪙 {item.price}
                    </Txt>
                  )}
                </PressChunky>
              </View>
            );
          })}
        </Grid>
      )}
    </Screen>
  );
}
