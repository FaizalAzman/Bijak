import { Text, type TextProps } from 'react-native';

type Variant = 'hero' | 'display' | 'title' | 'subtitle' | 'body' | 'small' | 'label' | 'mono' | 'number';

const VARIANTS: Record<Variant, string> = {
  hero: 'font-display-bold text-[34px] leading-[40px] text-ink',
  display: 'font-display-bold text-[26px] leading-[32px] text-ink',
  title: 'font-black text-[19px] leading-[25px] text-ink',
  subtitle: 'font-bold text-[16px] leading-[22px] text-ink',
  body: 'font-body text-[15px] leading-[22px] text-ink',
  small: 'font-semibold text-[13px] leading-[18px] text-muted',
  label: 'font-black text-[11px] leading-[14px] tracking-[1.6px] uppercase text-muted',
  mono: 'font-mono text-[13px] text-ink',
  number: 'font-display-bold text-[20px] text-ink',
};

/** Keep grouped numbers like "10 000" or "RM 5" on one line. */
const keepNumbersTogether = (s: string) => s.replace(/(\d) (?=\d{3}\b)/g, '$1\u00A0');

export function Txt({ variant = 'body', className = '', children, ...rest }: TextProps & { variant?: Variant; className?: string }) {
  return (
    <Text {...rest} className={`${VARIANTS[variant]} ${className}`}>
      {typeof children === 'string' ? keepNumbersTogether(children) : children}
    </Text>
  );
}

/** Renders **bold** and ==highlight== inline markup used in lesson JSON. */
export function RichText({ text, className = '', variant = 'body' }: { text: string; className?: string; variant?: Variant }) {
  const parts = text.split(/(\*\*[^*]+\*\*|==[^=]+==)/g).filter(Boolean);
  return (
    <Txt variant={variant} className={className}>
      {parts.map((p, i) =>
        p.startsWith('**') ? (
          <Text key={i} className="font-black text-ink">
            {p.slice(2, -2)}
          </Text>
        ) : p.startsWith('==') ? (
          <Text key={i} className="font-black bg-lime text-ink">
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        ),
      )}
    </Txt>
  );
}
