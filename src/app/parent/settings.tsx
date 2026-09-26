import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { toast } from '@/components/gamify/Toaster';
import { Button, Chunky, Keypad, PinDots, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { useParentSession, useRequireParent } from '@/features/profile/parentSession';
import { fx } from '@/lib/feedback';
import { setParentPin } from '@/lib/secure';
import { useApp } from '@/store/app';

export default function ParentSettings() {
  const ok = useRequireParent();
  const parent = useApp((s) => s.parent);
  const lock = useParentSession((s) => s.lock);
  const [pin, setPin] = useState('');
  const [changing, setChanging] = useState(false);
  if (!ok) return null;
  return (
    <Screen header={<TopBar title="Settings" />}>
      <SectionLabel>Parent PIN</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 16 }}>
        {changing ? (
          <>
            <Txt variant="subtitle">Enter a new 4-digit PIN</Txt>
            <PinDots length={4} filled={pin.length} />
            <Keypad
              compact
              onKey={async (k) => {
                const next = k === 'del' ? pin.slice(0, -1) : (pin + k).slice(0, 4);
                setPin(next);
                if (next.length === 4) {
                  await setParentPin(next);
                  fx.correct();
                  toast({ emoji: '🔒', title: 'PIN updated' });
                  setPin('');
                  setChanging(false);
                }
              }}
            />
          </>
        ) : (
          <Button label="Change PIN" tone="paper" onPress={() => setChanging(true)} />
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
