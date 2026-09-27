import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { toast } from '@/components/gamify/Toaster';
import { LanguagePicker } from '@/components/LanguagePicker';
import { ReminderSettings } from '@/components/parent/ReminderSettings';
import { VoicePicker } from '@/components/parent/VoicePicker';
import { Button, Chip, Chunky, Keypad, PinDots, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { REST_DAY_PRESETS, restDayPreset, type RestDayPreset } from '@/features/gamify/streak';
import { useParentSession, useRequireParent } from '@/features/profile/parentSession';
import { useT } from '@/i18n';
import { fx } from '@/lib/feedback';
import { setParentPin } from '@/lib/secure';
import { useApp } from '@/store/app';
import { colors } from '@/theme';

type PinStep = 'idle' | 'new' | 'confirm';

const REST_KEY = { none: 'settings.rest.none', satSun: 'settings.rest.satSun', friSat: 'settings.rest.friSat' } as const satisfies Record<RestDayPreset, string>;

export default function ParentSettings() {
  const ok = useRequireParent();
  const parent = useApp((s) => s.parent);
  const lock = useParentSession((s) => s.lock);
  const restDays = useApp((s) => s.settings.restDays);
  const updateSettings = useApp((s) => s.updateSettings);
  const [step, setStep] = useState<PinStep>('idle');
  const [first, setFirst] = useState('');
  const [pin, setPin] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const t = useT();
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
      toast({ emoji: '🔒', title: t('settings.pinUpdated') });
      cancel();
    } else {
      fx.wrong();
      setMismatch(true);
      setPin('');
    }
  };
  return (
    <Screen header={<TopBar title={t('dash.settings')} />}>
      <SectionLabel>{t('settings.language')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14 }}>
        <LanguagePicker hint title={false} />
      </Chunky>

      <SectionLabel>{t('settings.reminders')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14 }}>
        <ReminderSettings />
      </Chunky>

      <SectionLabel>{t('settings.restDays')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 12 }}>
        <Txt variant="small">{t('settings.restDaysHint')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(REST_DAY_PRESETS) as RestDayPreset[]).map((key) => (
            <Chip key={key} label={t(REST_KEY[key])} selected={restDayPreset(restDays) === key} onPress={() => updateSettings({ restDays: [...REST_DAY_PRESETS[key]] })} />
          ))}
        </View>
      </Chunky>

      <SectionLabel>{t('settings.voice')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14 }}>
        <VoicePicker />
      </Chunky>

      <SectionLabel>{t('settings.pin')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 16 }}>
        {step !== 'idle' ? (
          <>
            <Txt variant="subtitle">{step === 'new' ? t('settings.newPin') : t('settings.againPin')}</Txt>
            <PinDots length={4} filled={pin.length} error={mismatch} />
            {mismatch && (
              <Txt variant="small" style={{ color: colors.berry }} testID="pin-mismatch">
                {t('settings.pinMismatch')}
              </Txt>
            )}
            <Keypad compact onKey={onKey} />
            <Button label={t('common.cancel')} tone="paper" size="sm" onPress={cancel} />
          </>
        ) : (
          <Button label={t('settings.changePin')} tone="paper" onPress={() => setStep('new')} testID="change-pin" />
        )}
      </Chunky>
      <SectionLabel>{t('settings.family')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 6 }}>
        <Txt variant="subtitle">{parent?.name}</Txt>
        <Txt variant="mono" style={{ fontSize: 11 }}>
          {t('settings.familyId', parent?.familyId ?? '')}
        </Txt>
      </Chunky>
      <View style={{ marginTop: 24 }}>
        <Button
          label={t('settings.lock')}
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
