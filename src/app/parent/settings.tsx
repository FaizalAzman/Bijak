import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { toast } from '@/components/gamify/Toaster';
import { Button, Chunky, Keypad, PinDots, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { useParentSession, useRequireParent } from '@/features/profile/parentSession';
import { fx } from '@/lib/feedback';
import { setParentPin } from '@/lib/secure';
import { useApp } from '@/store/app';
import { colors } from '@/theme';

type PinStep = 'idle' | 'new' | 'confirm';

export default function ParentSettings() {
  const ok = useRequireParent();
  const parent = useApp((s) => s.parent);
  const lock = useParentSession((s) => s.lock);
  const [step, setStep] = useState<PinStep>('idle');
  const [first, setFirst] = useState('');
  const [pin, setPin] = useState('');
  const [mismatch, setMismatch] = useState(false);
  if (!ok) return null;

  const cancel = () => {
    setStep('idle');
    setFirst('');
    setPin('');
    setMismatch(false);
  };

  // The new PIN must be typed twice: a typo here would lock the parent out for good.
  const onKey = async (k: string) => {
    const next = k === 'del' ? pin.slice(0, -1) : (pin + k).slice(0, 4);
    setMismatch(false);
    setPin(next);
    if (next.length < 4) return;
    if (step === 'new') {
      setFirst(next);
      setPin('');
      setStep('confirm');
    } else if (next === first) {
      await setParentPin(next);
      fx.correct();
      toast({ emoji: '🔒', title: 'PIN updated' });
      cancel();
    } else {
      fx.wrong();
      setMismatch(true);
      setPin('');
    }
  };
  return (
    <Screen header={<TopBar title="Settings" />}>
      <SectionLabel>Parent PIN</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 16 }}>
        {step !== 'idle' ? (
          <>
            <Txt variant="subtitle">{step === 'new' ? 'Enter a new 4-digit PIN' : 'Type the new PIN again'}</Txt>
            <PinDots length={4} filled={pin.length} error={mismatch} />
            {mismatch && (
              <Txt variant="small" style={{ color: colors.berry }} testID="pin-mismatch">
                PINs don’t match. Type the new PIN again.
              </Txt>
            )}
            <Keypad compact onKey={onKey} />
            <Button label="Cancel" tone="paper" size="sm" onPress={cancel} />
          </>
        ) : (
          <Button label="Change PIN" tone="paper" onPress={() => setStep('new')} testID="change-pin" />
        )}
      </Chunky>
      <SectionLabel>Family</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 6 }}>
        <Txt variant="subtitle">{parent?.name}</Txt>
        <Txt variant="mono" style={{ fontSize: 11 }}>
          Family ID {parent?.familyId}
        </Txt>
      </Chunky>
      <View style={{ marginTop: 24 }}>
        <Button
          label="Lock parent zone"
          tone="ink"
          full
          onPress={() => {
            lock();
            router.replace('/');
          }}
        />
      </View>
    </Screen>
  );
}
