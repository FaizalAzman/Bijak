import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Chip, Txt } from '@/components/ui';
import { loadVoices, previewVoice, refreshVoices } from '@/lib/feedback';
import { useT } from '@/i18n';
import { rankVoices, voiceLabel, withoutOnlineTwins, type SpeechLang, type VoiceInfo } from '@/lib/voice';
import { useApp } from '@/store/app';

const LANGS = [
  { lang: 'en', title: 'voice.lang.en' },
  { lang: 'ms', title: 'voice.lang.ms' },
] as const satisfies readonly { lang: SpeechLang; title: string }[];
const SHOWN = 4;

/** Parents pick the read-aloud voice for each language, hearing each one before choosing. */
export function VoicePicker() {
  const chosen = useApp((s) => s.settings.voices);
  const updateSettings = useApp((s) => s.updateSettings);
  const [voices, setVoices] = useState<VoiceInfo[] | null>(null);
  const t = useT();

  useEffect(() => {
    let alive = true;
    loadVoices().then((list) => alive && setVoices(list));
    return () => {
      alive = false;
    };
  }, []);

  const choose = (lang: SpeechLang, id: string) => {
    updateSettings({ voices: { [lang]: id } });
    previewVoice(lang, id || undefined);
  };

  return (
    <View style={{ gap: 14 }}>
      {LANGS.map(({ lang, title }) => {
        const ranked = rankVoices(withoutOnlineTwins(voices ?? []), lang);
        const current = chosen?.[lang] && ranked.some((v) => v.identifier === chosen[lang]) ? chosen[lang] : undefined;
        // The best few, plus the parent's current pick if it is further down.
        const shown = ranked.filter((v, i) => i < SHOWN || v.identifier === current);
        const standIn = lang === 'ms' && ranked[0] && !ranked[0].language.toLowerCase().startsWith('ms');
        return (
          <View key={lang} style={{ gap: 8 }} testID={`voices-${lang}`}>
            <Txt variant="label">{t(title)}</Txt>
            {voices === null ? (
              <Txt variant="small">{t('voice.looking')}</Txt>
            ) : ranked.length === 0 ? (
              <Txt variant="small">{t('voice.none', t(title))}</Txt>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Chip label={t('voice.auto')} selected={!current} onPress={() => choose(lang, '')} />
                {shown.map((v) => (
                  <Chip key={v.identifier} label={voiceLabel(v, t.lang)} selected={current === v.identifier} onPress={() => choose(lang, v.identifier)} />
                ))}
              </View>
            )}
            {standIn && (
              <Txt variant="small" testID="ms-stand-in">
                {t('voice.standIn')}
              </Txt>
            )}
          </View>
        );
      })}
      <Txt variant="small">{t('voice.tip')}</Txt>
      <Button label={t('voice.refresh')} tone="paper" size="sm" onPress={() => refreshVoices().then(setVoices)} />
    </View>
  );
}
