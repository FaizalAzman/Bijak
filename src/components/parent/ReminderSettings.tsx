import { useState } from 'react';
import { View } from 'react-native';
import { Chip, Toggle, Txt } from '@/components/ui';
import { DEFAULT_REMINDERS, REMINDER_TIMES, STREAK_NUDGE_AT, timeLabel, type Reminders } from '@/features/reminders/plan';
import { allowNotifications, currentPlan, remindersSupported } from '@/features/reminders/service';
import { useApp } from '@/store/app';
import { colors } from '@/theme';

const WHEN: Intl.DateTimeFormatOptions = { weekday: 'short', hour: 'numeric', minute: '2-digit' };

/** Parent switches for the gentle reminders (asks the phone for permission when one is turned on). */
export function ReminderSettings() {
  const reminders = useApp((s) => s.settings.reminders ?? DEFAULT_REMINDERS);
  const update = useApp((s) => s.updateSettings);
  const [blocked, setBlocked] = useState(false);
  if (!remindersSupported()) return <Txt variant="small">Reminders work in the Bijak app on a phone or tablet.</Txt>;

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
        label="Daily reminder"
        hint={`School days at ${timeLabel(reminders.time)}, skipped once everyone has played`}
        value={reminders.daily}
        onChange={(v) => set({ daily: v })}
      />
      {reminders.daily && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 }}>
          {REMINDER_TIMES.map((t) => (
            <Chip key={t} label={timeLabel(t)} selected={reminders.time === t} onPress={() => set({ time: t })} />
          ))}
        </View>
      )}
      <Toggle
        label="Save-the-streak nudge"
        hint={`${timeLabel(STREAK_NUDGE_AT)}, only when a streak would end tonight`}
        value={reminders.streak}
        onChange={(v) => set({ streak: v })}
      />
      <Toggle label="Weekly report" hint="The evening before the school week" value={reminders.weekly} onChange={(v) => set({ weekly: v })} />
      {blocked && (
        <Txt variant="small" style={{ color: colors.berry }} testID="notifications-blocked">
          Notifications are turned off for Bijak. Allow them in your phone’s Settings, then try again.
        </Txt>
      )}
      {next && (
        <Txt variant="small" testID="next-reminder">
          {`Next: ${next.at.toLocaleString('en-MY', WHEN)} · ${next.title}`}
        </Txt>
      )}
    </View>
  );
}
