import { View } from 'react-native';
import { Chip, Txt } from '@/components/ui';
import { UI_LANGS, useT, type UiLang } from '@/i18n';
import { useApp } from '@/store/app';

/** Each language is named in itself, so anyone can find theirs. */
export const LANGUAGE_NAME: Record<UiLang, string> = { en: 'English', ms: 'Bahasa Melayu' };

/** The app language switch (buttons, messages and reports; lessons keep each child's language). */
export function LanguagePicker({ hint = false, title = true }: { hint?: boolean; title?: boolean }) {
  const t = useT();
  const updateSettings = useApp((s) => s.updateSettings);
  return (
    <View style={{ gap: 8 }} testID="language-picker">
      {title ? <Txt variant="label">{t('lang.pickerTitle')}</Txt> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {UI_LANGS.map((lang) => (
          <Chip key={lang} label={LANGUAGE_NAME[lang]} selected={t.lang === lang} onPress={() => updateSettings({ uiLang: lang })} />
        ))}
      </View>
      {hint ? <Txt variant="small">{t('lang.hint')}</Txt> : null}
    </View>
  );
}
