import { Modal, View } from 'react-native';
import { Kancil } from '@/components/mascot/Kancil';
import { Button, Txt } from '@/components/ui';
import { tierFor } from '@/features/gamify/xp';
import { useT } from '@/i18n';
import { colors } from '@/theme';
import { Confetti } from './Confetti';

export function LevelUpModal({ level, onClose }: { level: number | null; onClose: () => void }) {
  const tier = level ? tierFor(level) : null;
  const t = useT();
  return (
    <Modal visible={level != null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(22,20,15,0.93)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Confetti count={30} />
        <View style={{ alignItems: 'center', gap: 10, width: '100%', maxWidth: 380 }}>
          <Kancil mood="cheer" size={170} />
          <Txt variant="label" style={{ color: colors.lime, fontSize: 14 }}>
            {t('levelUp.title')}
          </Txt>
          <View
            style={{
              backgroundColor: colors.lime,
              borderWidth: 3,
              borderColor: colors.ink,
              borderRadius: 28,
              paddingHorizontal: 36,
              paddingVertical: 6,
              boxShadow: `6px 6px 0px ${colors.grape}`,
            }}
          >
            <Txt variant="hero" style={{ fontSize: 72, lineHeight: 84 }}>
              {level}
            </Txt>
          </View>
          {tier && (
            <Txt variant="title" style={{ color: colors.paper, marginTop: 8 }}>
              {t('levelUp.rank', tier.emoji, t(tier.key))}
            </Txt>
          )}
          <Txt variant="body" style={{ color: '#D9D2C2', textAlign: 'center' }}>
            {t('levelUp.body')}
          </Txt>
          <View style={{ width: '100%', marginTop: 10 }}>
            <Button label={t('levelUp.ok')} tone="lime" size="lg" full onPress={onClose} testID="levelup-ok" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
