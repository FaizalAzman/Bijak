/**
 * Module 9 — Dynamic Lesson & Asset Parser.
 * Renders JSON lesson blocks natively: rich text, maths, fractions, place-value charts,
 * number lines, emoji arrays, tables and tappable vocabulary with pronunciation.
 * Illustrations are emoji/SVG so the bundle stays tiny.
 */
import { Volume2 } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { RichText, Txt } from '@/components/ui';
import type { LessonBlock } from '@/features/content/schema';
import { fx, speak } from '@/lib/feedback';
import { groupDigits } from '@/lib/format';
import { colors, fonts } from '@/theme';

function SpeakButton({ text, lang, size = 34 }: { text: string; lang: 'en' | 'ms'; size?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Listen: ${text}`}
      onPress={() => {
        fx.tap();
        speak(text, lang);
      }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.sky,
        borderWidth: 2,
        borderColor: colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Volume2 size={size * 0.5} color={colors.ink} strokeWidth={2.5} />
    </Pressable>
  );
}

function PlaceValue({ n }: { n: number }) {
  const digits = String(n).split('');
  const names = ['Ones', 'Tens', 'Hundreds', 'Thousands', 'Ten thousands', 'Hundred thousands', 'Millions'];
  const tints = [colors['mint-soft'], colors['sky-soft'], colors['sun-soft'], colors['tangerine-soft'], colors['grape-soft'], colors['berry-soft'], colors.sand];
  return (
    <View style={{ flexDirection: 'row', borderWidth: 2, borderColor: colors.ink, borderRadius: 14, overflow: 'hidden' }}>
      {digits.map((d, i) => {
        const place = digits.length - 1 - i;
        return (
          <View key={i} style={{ flex: 1, backgroundColor: tints[place], borderLeftWidth: i ? 2 : 0, borderColor: colors.ink }}>
            <View style={{ paddingVertical: 6, borderBottomWidth: 2, borderColor: colors.ink, alignItems: 'center' }}>
              <Txt style={{ fontFamily: fonts.black, fontSize: 10, textAlign: 'center' }} numberOfLines={2}>
                {names[place]}
              </Txt>
            </View>
            <Txt variant="hero" style={{ textAlign: 'center', paddingVertical: 8, fontSize: 38 }}>
              {d}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

function NumberLine({ from, to, step, highlight }: { from: number; to: number; step: number; highlight: number[] }) {
  const ticks: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
  const W = 320;
  const pad = 18;
  const x = (v: number) => pad + ((v - from) / (to - from || 1)) * (W - pad * 2);
  const labelEvery = ticks.length > 8 ? 2 : 1;
  return (
    <Svg width="100%" height={80} viewBox={`0 0 ${W} 80`}>
      <Line x1={pad - 8} y1={36} x2={W - pad + 8} y2={36} stroke={colors.ink} strokeWidth={3} strokeLinecap="round" />
      {ticks.map((v, i) => (
        <Line key={v} x1={x(v)} y1={28} x2={x(v)} y2={44} stroke={colors.ink} strokeWidth={i % labelEvery ? 2 : 3} />
      ))}
      {ticks.map((v, i) =>
        i % labelEvery === 0 || highlight.includes(v) ? (
          <SvgText key={`l${v}`} x={x(v)} y={64} fontSize={11} fontWeight="bold" textAnchor="middle" fill={highlight.includes(v) ? colors.grape : colors.ink}>
            {groupDigits(v)}
          </SvgText>
        ) : null,
      )}
      {highlight.map((v) => (
        <Circle key={`h${v}`} cx={x(v)} cy={36} r={9} fill={colors.lime} stroke={colors.ink} strokeWidth={3} />
      ))}
    </Svg>
  );
}

function Fraction({ n, d }: { n: number; d: number }) {
  const W = 300;
  const w = (W - 4) / d;
  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <View style={{ alignItems: 'center' }}>
        <Txt variant="hero" style={{ fontSize: 40, lineHeight: 44 }}>
          {n}
        </Txt>
        <View style={{ width: 54, height: 4, backgroundColor: colors.ink, borderRadius: 2 }} />
        <Txt variant="hero" style={{ fontSize: 40, lineHeight: 46 }}>
          {d}
        </Txt>
      </View>
      <Svg width="100%" height={46} viewBox={`0 0 ${W} 46`}>
        {Array.from({ length: d }, (_, i) => (
          <Rect
            key={i}
            x={2 + i * w}
            y={2}
            width={w}
            height={42}
            fill={i < n ? colors.lime : colors.paper}
            stroke={colors.ink}
            strokeWidth={3}
            rx={i === 0 || i === d - 1 ? 6 : 0}
          />
        ))}
      </Svg>
    </View>
  );
}

function Card({ children, bg = colors.paper }: { children: React.ReactNode; bg?: string }) {
  return <View style={{ backgroundColor: bg, borderWidth: 2, borderColor: colors.ink, borderRadius: 16, padding: 14, gap: 8 }}>{children}</View>;
}

export function LessonBlockView({ block, lang }: { block: LessonBlock; lang: 'en' | 'ms' }) {
  switch (block.type) {
    case 'heading':
      return (
        <Txt variant="display" style={{ fontSize: 24, lineHeight: 30 }}>
          {block.text}
        </Txt>
      );
    case 'text':
      return <RichText text={block.text} className="text-[17px] leading-[26px]" />;
    case 'callout': {
      const bg = block.tone === 'remember' ? colors['tangerine-soft'] : block.tone === 'fun' ? colors['grape-soft'] : colors['sun-soft'];
      return (
        <Card bg={bg}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Txt style={{ fontSize: 24 }}>{block.emoji ?? '💡'}</Txt>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="label" style={{ color: colors.ink }}>
                {block.tone === 'remember' ? 'Remember' : block.tone === 'fun' ? 'Fun fact' : 'Tip'}
              </Txt>
              <RichText text={block.text} />
            </View>
          </View>
        </Card>
      );
    }
    case 'list':
      return (
        <View style={{ gap: 8 }}>
          {block.items.map((it, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: colors.lime,
                  borderWidth: 2,
                  borderColor: colors.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                <Txt style={{ fontFamily: fonts.black, fontSize: 11 }}>{block.ordered ? i + 1 : '•'}</Txt>
              </View>
              <RichText text={it} className="flex-1 text-[16px]" />
            </View>
          ))}
        </View>
      );
    case 'math':
      return (
        <Card bg={colors.ink}>
          <Txt variant="hero" style={{ color: colors.lime, textAlign: 'center', fontSize: 30, lineHeight: 38 }} adjustsFontSizeToFit numberOfLines={2}>
            {block.expr}
          </Txt>
          {block.caption ? (
            <Txt variant="small" style={{ color: '#BDB6A6', textAlign: 'center' }}>
              {block.caption}
            </Txt>
          ) : null}
        </Card>
      );
    case 'fraction':
      return (
        <Card>
          <Fraction n={block.numerator} d={block.denominator} />
          {block.caption ? (
            <Txt variant="small" style={{ textAlign: 'center' }}>
              {block.caption}
            </Txt>
          ) : null}
        </Card>
      );
    case 'example':
      return (
        <Card bg={colors['sky-soft']}>
          {block.title ? <Txt variant="label" style={{ color: colors.ink }}>{`Example · ${block.title}`}</Txt> : <Txt variant="label">Example</Txt>}
          {block.lines.map((l, i) => (
            <RichText key={i} text={l} className="font-mono text-[16px] leading-[24px]" />
          ))}
        </Card>
      );
    case 'vocab':
      return (
        <View style={{ gap: 8 }}>
          {block.items.map((v) => (
            <View
              key={v.word}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink, borderRadius: 14, padding: 10 }}
            >
              <Txt style={{ fontSize: 30, width: 40, textAlign: 'center' }}>{v.emoji ?? '🔤'}</Txt>
              <View style={{ flex: 1 }}>
                <Txt variant="title">{v.word}</Txt>
                <Txt variant="small">{v.meaning}</Txt>
              </View>
              <SpeakButton text={v.word} lang={block.lang} />
            </View>
          ))}
        </View>
      );
    case 'table':
      return (
        <View style={{ borderWidth: 2, borderColor: colors.ink, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.paper }}>
          <View style={{ flexDirection: 'row', backgroundColor: colors.sand, borderBottomWidth: 2, borderColor: colors.ink }}>
            {block.headers.map((h, i) => (
              <Txt key={i} variant="label" style={{ flex: 1, padding: 10, color: colors.ink }}>
                {h}
              </Txt>
            ))}
          </View>
          {block.rows.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', borderTopWidth: i ? 1 : 0, borderColor: colors.line }}>
              {r.map((c, j) => (
                <RichText key={j} text={c} className={`flex-1 p-[10px] text-[15px] ${j === 0 ? 'font-bold' : ''}`} />
              ))}
            </View>
          ))}
        </View>
      );
    case 'placeValue':
      return <PlaceValue n={block.number} />;
    case 'numberLine':
      return (
        <Card>
          <NumberLine from={block.from} to={block.to} step={block.step} highlight={block.highlight} />
        </Card>
      );
    case 'image':
      return (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Txt style={{ fontSize: 80, lineHeight: 96 }}>{block.emoji}</Txt>
          {block.caption ? <Txt variant="small">{block.caption}</Txt> : null}
        </View>
      );
    case 'emojiGrid':
      return (
        <Card bg={colors['sun-soft']}>
          <View style={{ alignItems: 'center', gap: 2 }}>
            {Array.from({ length: block.rows }, (_, r) => (
              <View key={r} style={{ flexDirection: 'row', gap: 2 }}>
                {Array.from({ length: block.cols }, (_, c) => (
                  <Txt key={c} style={{ fontSize: block.cols > 8 ? 18 : 26 }}>
                    {block.emoji}
                  </Txt>
                ))}
              </View>
            ))}
          </View>
          {block.caption ? (
            <Txt variant="subtitle" style={{ textAlign: 'center' }}>
              {block.caption}
            </Txt>
          ) : null}
        </Card>
      );
    case 'say':
      return (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: colors['sky-soft'],
            borderWidth: 2,
            borderColor: colors.ink,
            borderRadius: 16,
            padding: 12,
          }}
        >
          <SpeakButton text={block.text} lang={block.lang ?? lang} size={44} />
          <Txt variant="subtitle" style={{ flex: 1, fontStyle: 'italic' }}>
            “{block.text}”
          </Txt>
        </View>
      );
  }
}

/** Group blocks into bite-size slides, breaking at each heading. */
export function toSlides(blocks: LessonBlock[]): LessonBlock[][] {
  const slides: LessonBlock[][] = [];
  for (const b of blocks) {
    const last = slides[slides.length - 1];
    if (!last || b.type === 'heading' || last.length >= 4) slides.push([b]);
    else last.push(b);
  }
  return slides;
}
