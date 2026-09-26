import { useState } from 'react';
import { View } from 'react-native';
import { Chip, Toggle, Txt } from '@/components/ui';
import { DEFAULT_REMINDERS, REMINDER_TIMES, STREAK_NUDGE_AT, type Reminders } from '@/features/reminders/plan';
import { allowNotifications, currentPlan, remindersSupported } from '@/features/reminders/service';
import { timeLabel, useT } from '@/i18n';
import { useApp } from '@/store/app';
import { colors } from '@/theme';

const WHEN: Intl.DateTimeFormatOptions = { weekday: 'short', hour: 'numeric', minute: '2-digit' };

/** Parent switches for the gentle reminders (asks the phone for permission when one is turned on). */
export function ReminderSettings() {
  const reminders = useApp((s) => s.settings.reminders ?? DEFAULT_REMINDERS);
  const update = useApp((s) => s.updateSettings);
  const [blocked, setBlocked] = useState(false);
  const t = useT();
  if (!remindersSupported()) return <Txt variant="small">{t('rem.webOnly')}</Txt>;

  const set = async (patch: Partial<Reminders>) => {
    if (Object.values(patch).includes(true)) {
      const ok = await allowNotifications();
      setBlocked(!ok);
      if (!ok) return;
    }
    update({ reminders: patch });
  };
  const next = reminders.daily || reminders.streak || reminders.weekly ? currentPlan()[0] : undefined;

  return (
    <View style={{ gap: 4 }}>
      <Toggle
        label={t('rem.daily')}
        hint={t('rem.daily.hint', timeLabel(reminders.time, t.lang))}
        value={reminders.daily}
        onChange={(v) => set({ daily: v })}
      />
      {reminders.daily && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 }}>
          {REMINDER_TIMES.map((time) => (
            <Chip key={time} label={timeLabel(time, t.lang)} selected={reminders.time === time} onPress={() => set({ time })} />
          ))}
        </View>
      )}
      <Toggle
        label={t('rem.streak')}
        hint={t('rem.streak.hint', timeLabel(STREAK_NUDGE_AT, t.lang))}
        value={reminders.streak}
        onChange={(v) => set({ streak: v })}
      />
      <Toggle label={t('rem.weekly')} hint={t('rem.weekly.hint')} value={reminders.weekly} onChange={(v) => set({ weekly: v })} />
      {blocked && (
        <Txt variant="small" style={{ color: colors.berry }} testID="notifications-blocked">
          {t('rem.blocked')}
        </Txt>
      )}
      {next && (
        <Txt variant="small" testID="next-reminder">
          {t('rem.next', next.at.toLocaleString(t('date.locale'), WHEN), next.title)}
        </Txt>
      )}
    </View>
  );
}
