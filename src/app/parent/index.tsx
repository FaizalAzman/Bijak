import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useShake } from '@/components/quiz/useShake';
import { MascotSays } from '@/components/mascot/MascotSays';
import { Keypad, PinDots, Screen, TopBar, Txt } from '@/components/ui';
import { isParentUnlocked, useParentSession } from '@/features/profile/parentSession';
import { fx } from '@/lib/feedback';
import { verifyParentPin } from '@/lib/secure';
import { colors } from '@/theme';

/** PIN gate for the Parent Zone (Module 20). */
export default function ParentGate() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const unlock = useParentSession((s) => s.unlock);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const { style, shake } = useShake();

  const go = () => (next === 'add-child' ? router.replace('/onboarding') : router.replace('/parent/dashboard'));

  useEffect(() => {
    if (isParentUnlocked()) go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKey = async (k: string) => {
    if (attempts >= 5) return;
    setError(false);
    const nextPin = k === 'del' ? pin.slice(0, -1) : (pin + k).slice(0, 4);
    setPin(nextPin);
    if (nextPin.length === 4) {
      if (await verifyParentPin(nextPin)) {
        fx.correct();
        unlock();
        go();
      } else {
        fx.wrong();
        shake();
        setError(true);
        setAttempts((a) => a + 1);
        setTimeout(() => setPin(''), 400);
        if (attempts + 1 >= 5) setTimeout(() => setAttempts(0), 30_000);
      }
    }
  };

  return (
    <Screen header={<TopBar title="Parent zone" close />}>
      <View style={{ gap: 26, paddingTop: 10 }}>
        <MascotSays text="Grown-ups only! Enter your 4-digit parent PIN." mood="think" size={90} />
        <Animated.View style={style}>
          <PinDots length={4} filled={pin.length} error={error} />
        </Animated.View>
        {attempts >= 5 ? (
          <Txt variant="small" style={{ textAlign: 'center', color: colors.berry }}>
            Too many tries. Wait 30 seconds.
          </Txt>
        ) : error ? (
          <Txt variant="small" style={{ textAlign: 'center', color: colors.berry }}>
            Wrong PIN, try again.
          </Txt>
        ) : null}
        <Keypad onKey={onKey} disabled={attempts >= 5} />
      </View>
    </Screen>
  );
}
