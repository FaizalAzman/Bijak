import { View } from 'react-native';
import { Chip, Txt } from '@/components/ui';
import type { Lang } from '@/features/content/schema';
import { useT } from '@/i18n';

const MEDIUM_KEY = { en: 'medium.en', ms: 'medium.ms' } as const satisfies Record<Lang, string>;

/** Which language the child's class learns Maths & Science in (DLP classes use English). */
export function MediumPicker({ value, onChange }: { value: Lang | null | undefined; onChange: (lang: Lang) => void }) {
  const t = useT();
  return (
    <View style={{ gap: 10 }}>
      <Txt variant="label">{t('medium.label')}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['en', 'ms'] as const).map((lang) => (
          <Chip key={lang} label={t(MEDIUM_KEY[lang])} selected={value === lang} onPress={() => onChange(lang)} />
        ))}
      </View>
    </View>
  );
}
