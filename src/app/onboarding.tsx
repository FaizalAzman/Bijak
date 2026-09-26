import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Avatar } from '@/components/avatar/Avatar';
import { AvatarBasics } from '@/components/avatar/AvatarBasics';
import { MascotSays } from '@/components/mascot/MascotSays';
import { Kancil } from '@/components/mascot/Kancil';
import { Button, Chip, Chunky, Field, Keypad, PinDots, ProgressBar, Screen, Txt } from '@/components/ui';
import { useContentIndex } from '@/features/content/registry';
import { DEFAULT_AVATAR, type AvatarConfig } from '@/features/gamify/shop';
import { fx } from '@/lib/feedback';
import { setParentPin } from '@/lib/secure';
import { useApp } from '@/store/app';
import { colors } from '@/theme';

type Step = 'welcome' | 'parent' | 'pin' | 'confirm' | 'child' | 'avatar';
const ORDER: Step[] = ['welcome', 'parent', 'pin', 'confirm', 'child', 'avatar'];

export default function Onboarding() {
  const index = useContentIndex();
  const hasParent = useApp((s) => !!s.parent);
  const [step, setStep] = useState<Step>(hasParent ? 'child' : 'welcome');
  const [parentName, setParentName] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pinError, setPinError] = useState(false);
  const [childName, setChildName] = useState('');
  const [level, setLevel] = useState(3);
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [saving, setSaving] = useState(false);

  const progress = (ORDER.indexOf(step) + 1) / ORDER.length;

  const onPinKey = (k: string, which: 'pin' | 'confirm') => {
    const cur = which === 'pin' ? pin : confirm;
    const next = k === 'del' ? cur.slice(0, -1) : (cur + k).slice(0, 4);
    setPinError(false);
    if (which === 'pin') {
      setPin(next);
      if (next.length === 4) setTimeout(() => setStep('confirm'), 180);
    } else {
      setConfirm(next);
      if (next.length === 4) {
        if (next === pin) setTimeout(() => setStep('child'), 180);
        else {
          fx.wrong();
          setPinError(true);
          setTimeout(() => setConfirm(''), 500);
        }
      }
    }
  };

  const finish = async () => {
    setSaving(true);
    const s = useApp.getState();
    if (!s.parent) {
      s.setupFamily(parentName || 'Parent');
      await setParentPin(pin);
    }
    const id = s.addProfile({ name: childName.trim(), level, avatar });
    useApp.getState().selectProfile(id);
    fx.levelUp();
    router.replace('/home');
  };

  const mascot: Record<Step, { text: string; mood: 'wave' | 'happy' | 'think' | 'cheer' | 'idle' }> = {
    welcome: { text: "Hai! I'm Sang Kancil. Let's make learning your superpower!", mood: 'wave' },
    parent: { text: 'First, a grown-up please! What should I call you?', mood: 'idle' },
    pin: { text: 'Create a 4-digit parent PIN. It protects the Parent Zone.', mood: 'think' },
    confirm: { text: 'Type the PIN one more time.', mood: 'think' },
    child: { text: 'Now tell me about our learner!', mood: 'happy' },
    avatar: { text: `Looking great${childName ? `, ${childName}` : ''}! Style your character.`, mood: 'cheer' },
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={
          step !== 'welcome' ? (
            <View style={{ paddingHorizontal: 18, paddingTop: 10, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
              <ProgressBar value={progress} height={12} />
            </View>
          ) : null
        }
      >
        {step === 'welcome' ? (
          <View style={{ alignItems: 'center', paddingTop: 40, gap: 18 }}>
            <Animated.View entering={FadeInDown.springify().damping(12)}>
              <Kancil mood="wave" size={190} />
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(150)} style={{ alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Txt variant="hero" style={{ fontSize: 56, lineHeight: 64 }}>
                  bijak
                </Txt>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.tangerine, borderWidth: 2, borderColor: colors.ink, marginLeft: 4 }} />
              </View>
              <Txt variant="subtitle" style={{ textAlign: 'center', color: colors.muted, maxWidth: 300 }}>
                Fun KSSR learning for Standard 1–6. Maths, Science, English & Bahasa Melayu.
              </Txt>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(300)} style={{ width: '100%', gap: 12, marginTop: 20 }}>
              {[
                ['🎮', 'Quizzes that feel like games'],
                ['🧠', 'Smart review of tricky questions'],
                ['👨‍👩‍👧', 'Progress reports for parents'],
              ].map(([e, t]) => (
                <Chunky key={t} innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                  <Txt style={{ fontSize: 24 }}>{e}</Txt>
                  <Txt variant="subtitle">{t}</Txt>
                </Chunky>
              ))}
            </Animated.View>
            <View style={{ width: '100%', marginTop: 18 }}>
              <Button
                label="Let's go!"
                tone="lime"
                size="lg"
                full
                iconRight={<ArrowRight size={20} color={colors.ink} strokeWidth={3} />}
                onPress={() => setStep('parent')}
                testID="start"
              />
            </View>
          </View>
        ) : (
          <Animated.View key={step} entering={FadeInRight.springify().damping(16)} style={{ gap: 20, paddingTop: 12 }}>
            <MascotSays text={mascot[step].text} mood={mascot[step].mood} />

            {step === 'parent' && (
              <View style={{ gap: 16 }}>
                <Field
                  label="Parent's name"
                  placeholder="e.g. Faizal"
                  value={parentName}
                  onChangeText={setParentName}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => parentName.trim() && setStep('pin')}
                />
                <Button label="Continue" full size="lg" disabled={!parentName.trim()} onPress={() => setStep('pin')} />
              </View>
            )}

            {(step === 'pin' || step === 'confirm') && (
              <View style={{ gap: 26, alignItems: 'stretch' }}>
                <PinDots length={4} filled={(step === 'pin' ? pin : confirm).length} error={pinError} />
                {pinError && (
                  <Txt variant="small" style={{ textAlign: 'center', color: colors.berry }}>
                    PINs don’t match. Try again.
                  </Txt>
                )}
                <Keypad onKey={(k) => onPinKey(k, step === 'pin' ? 'pin' : 'confirm')} />
                {step === 'confirm' && (
                  <Button
                    label="Start over"
                    tone="paper"
                    size="sm"
                    onPress={() => {
                      setPin('');
                      setConfirm('');
                      setStep('pin');
                    }}
                  />
                )}
              </View>
            )}

            {step === 'child' && (
              <View style={{ gap: 18 }}>
                <Field label="Child's name" placeholder="e.g. Adam" value={childName} onChangeText={setChildName} autoFocus={!hasParent} />
                <View style={{ gap: 10 }}>
                  <Txt variant="label">Which standard?</Txt>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {index.standards.map((s) => (
                      <Chip key={s.id} label={s.title} count={s.titleAlt} selected={level === s.level} onPress={() => setLevel(s.level)} />
                    ))}
                  </View>
                </View>
                <Button label="Continue" full size="lg" disabled={!childName.trim()} onPress={() => setStep('avatar')} />
              </View>
            )}

            {step === 'avatar' && (
              <View style={{ gap: 18 }}>
                <View style={{ alignItems: 'center' }}>
                  <Avatar config={avatar} size={150} mood="excited" />
                </View>
                <Chunky innerStyle={{ padding: 16 }}>
                  <AvatarBasics value={avatar} onChange={(p) => setAvatar((a) => ({ ...a, ...p }))} />
                </Chunky>
                <Button label="Start learning!" tone="lime" size="lg" full loading={saving} onPress={finish} testID="finish-onboarding" />
              </View>
            )}
          </Animated.View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
