import { View } from 'react-native';
import { Chip, Txt } from '@/components/ui';
import type { Lang } from '@/features/content/schema';

export const MEDIUM_LABEL: Record<Lang, string> = { en: 'English (DLP)', ms: 'Bahasa Melayu' };

/** Which language the child's class learns Maths & Science in (DLP classes use English). */
export function MediumPicker({ value, onChange }: { value: Lang | null | undefined; onChange: (lang: Lang) => void }) {
  return (
    <View style={{ gap: 10 }}>
      <Txt variant="label">Maths & Science at school are taught in</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['en', 'ms'] as const).map((lang) => (
          <Chip key={lang} label={MEDIUM_LABEL[lang]} selected={value === lang} onPress={() => onChange(lang)} />
        ))}
      </View>
    </View>
  );
}
