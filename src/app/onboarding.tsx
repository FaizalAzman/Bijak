import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Avatar } from '@/components/avatar/Avatar';
import { AvatarBasics } from '@/components/avatar/AvatarBasics';
import { MascotSays } from '@/components/mascot/MascotSays';
import { Kancil } from '@/components/mascot/Kancil';
import { LanguagePicker } from '@/components/LanguagePicker';
import { MediumPicker } from '@/components/parent/MediumPicker';
import { Button, Chip, Chunky, Field, FrameRow, Keypad, PinDots, ProgressBar, Screen, Txt } from '@/components/ui';
import { useContentIndex } from '@/features/content/registry';
import type { Lang } from '@/features/content/schema';
import { DEFAULT_AVATAR, type AvatarConfig } from '@/features/gamify/shop';
import { useLayout } from '@/hooks/useLayout';
import { standardName, useT } from '@/i18n';
import { fx } from '@/lib/feedback';
import { setParentPin } from '@/lib/secure';
import { useApp } from '@/store/app';
import { colors } from '@/theme';
import { swapIn } from '@/theme/motion';

type Step = 'welcome' | 'parent' | 'pin' | 'confirm' | 'child' | 'avatar';
const ORDER: Step[] = ['welcome', 'parent', 'pin', 'confirm', 'child', 'avatar'];

export default function Onboarding() {
  const index = useContentIndex();
  const layout = useLayout();
  const hasParent = useApp((s) => !!s.parent);
  const [step, setStep] = useState<Step>(hasParent ? 'child' : 'welcome');
  const [parentName, setParentName] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pinError, setPinError] = useState(false);
  const [childName, setChildName] = useState('');
  const [level, setLevel] = useState(3);
  const [medium, setMedium] = useState<Lang | null>(null);
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [saving, setSaving] = useState(false);
  const t = useT();

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
    try {
      const s = useApp.getState();
      if (!s.parent) {
        s.setupFamily(parentName.trim() || t('onboarding.defaultParent'));
        await setParentPin(pin);
      }
      const id = s.addProfile({ name: childName.trim(), level, avatar, medium: medium ?? 'en' });
      useApp.getState().selectProfile(id);
      fx.levelUp();
      router.replace('/home');
    } catch {
      fx.wrong();
      setSaving(false);
    }
  };

  const mascot: Record<Step, { text: string; mood: 'wave' | 'happy' | 'think' | 'cheer' | 'idle' }> = {
    welcome: { text: t('onboarding.mascot.welcome'), mood: 'wave' },
    parent: { text: t('onboarding.mascot.parent'), mood: 'idle' },
    pin: { text: t('onboarding.mascot.pin'), mood: 'think' },
    confirm: { text: t('onboarding.mascot.confirm'), mood: 'think' },
    child: { text: t('onboarding.mascot.child'), mood: 'happy' },
    avatar: { text: t('onboarding.mascot.avatar', childName), mood: 'cheer' },
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={
          step !== 'welcome' ? (
            <FrameRow style={{ paddingTop: 10 }}>
              <ProgressBar value={progress} height={12} />
            </FrameRow>
          ) : null
        }
      >
        {step === 'welcome' ? (
          <View style={{ alignItems: 'center', paddingTop: 40, gap: 18 }}>
            <View>
              <Kancil mood="wave" size={layout.isTablet ? 220 : layout.small ? 140 : 190} />
            </View>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Txt variant="hero" style={{ fontSize: 56, lineHeight: 64 }}>
                  bijak
                </Txt>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.tangerine, borderWidth: 2, borderColor: colors.ink, marginLeft: 4 }} />
              </View>
              <Txt variant="subtitle" style={{ textAlign: 'center', color: colors.muted, maxWidth: 300 }}>
                {t('onboarding.tagline')}
              </Txt>
            </View>
            <View style={{ width: '100%', gap: 12, marginTop: 20 }}>
              {(
                [
                  ['🎮', 'onboarding.feature.games'],
                  ['🧠', 'onboarding.feature.review'],
                  ['👨‍👩‍👧', 'onboarding.feature.reports'],
                ] as const
              ).map(([e, key]) => (
                <Chunky key={key} innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                  <Txt style={{ fontSize: 24 }}>{e}</Txt>
                  <Txt variant="subtitle">{t(key)}</Txt>
                </Chunky>
              ))}
            </View>
            <View style={{ width: '100%' }}>
              <LanguagePicker />
            </View>
            <View style={{ width: '100%', marginTop: 8 }}>
              <Button
                label={t('onboarding.start')}
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
          <Animated.View key={step} entering={swapIn} style={{ gap: 20, paddingTop: 12 }}>
            <MascotSays text={mascot[step].text} mood={mascot[step].mood} />

            {step === 'parent' && (
              <View style={{ gap: 16 }}>
                <Field
                  label={t('onboarding.parentName')}
                  placeholder={t('onboarding.parentPlaceholder')}
                  value={parentName}
                  onChangeText={setParentName}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => parentName.trim() && setStep('pin')}
                />
                <Button label={t('common.continue')} full size="lg" disabled={!parentName.trim()} onPress={() => setStep('pin')} />
              </View>
            )}

            {(step === 'pin' || step === 'confirm') && (
              <View style={{ gap: 26, alignItems: 'stretch' }}>
                <PinDots length={4} filled={(step === 'pin' ? pin : confirm).length} error={pinError} />
                {pinError && (
                  <Txt variant="small" style={{ textAlign: 'center', color: colors.berry }}>
                    {t('onboarding.pinMismatch')}
                  </Txt>
                )}
                <Keypad onKey={(k) => onPinKey(k, step === 'pin' ? 'pin' : 'confirm')} />
                {step === 'confirm' && (
                  <Button
                    label={t('onboarding.startOver')}
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
                <Field label={t('onboarding.childName')} placeholder={t('onboarding.childPlaceholder')} value={childName} onChangeText={setChildName} autoFocus={!hasParent} />
                <View style={{ gap: 10 }}>
                  <Txt variant="label">{t('onboarding.whichStandard')}</Txt>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {index.standards.map((s) => (
                      <Chip key={s.id} label={standardName(s, t.lang)} count={standardName(s, t.lang === 'ms' ? 'en' : 'ms')} selected={level === s.level} onPress={() => setLevel(s.level)} />
                    ))}
                  </View>
                </View>
                <MediumPicker value={medium} onChange={setMedium} />
                <Button label={t('common.continue')} full size="lg" disabled={!childName.trim() || !medium} onPress={() => setStep('avatar')} />
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
                <Button label={t('onboarding.finish')} tone="lime" size="lg" full loading={saving} onPress={finish} testID="finish-onboarding" />
              </View>
            )}
          </Animated.View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
