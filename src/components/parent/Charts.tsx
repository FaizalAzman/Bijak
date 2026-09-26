/** Parent dashboard charts: single-hue bars (grape) with ink outlines; identity via text labels. */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Txt } from '@/components/ui';
import { colors } from '@/theme';
import { DURATION } from '@/theme/motion';

const BAR = colors.grape;

export function ColumnChart({ data, unit, height = 150 }: { data: { label: string; value: number; sub?: string }[]; unit: string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((m, d, i) => (d.value > data[m].value ? i : m), 0);
  const [sel, setSel] = useState<number | null>(null);
  const shown = sel ?? (data[peak]?.value ? peak : null);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height: height + 24, flexDirection: 'row', alignItems: 'flex-end', gap: 6, borderBottomWidth: 2, borderColor: colors.ink }}>
        {data.map((d, i) => {
          const h = d.value > 0 ? Math.max(6, (d.value / max) * height) : 0;
          return (
            <Pressable
              key={d.label + i}
              accessibilityRole="button"
              accessibilityLabel={`${d.label}: ${d.value} ${unit}`}
              onPress={() => setSel(sel === i ? null : i)}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: height + 24 }}
            >
              {shown === i && (
                <Animated.View
                  entering={FadeIn.duration(DURATION.fast)}
                  style={{ marginBottom: 4, backgroundColor: colors.ink, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 }}
                >
                  <Txt style={{ color: colors.paper, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 11 }}>
                    {d.value}
                    {unit}
                  </Txt>
                </Animated.View>
              )}
              <View
                style={{
                  width: '72%',
                  height: h,
                  backgroundColor: sel === i ? colors.ink : BAR,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  borderWidth: h ? 1.5 : 0,
                  borderBottomWidth: 0,
                  borderColor: colors.ink,
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {data.map((d, i) => (
          <Txt key={i} variant="small" style={{ flex: 1, textAlign: 'center', fontSize: 11, color: shown === i ? colors.ink : colors.muted }}>
            {d.label}
          </Txt>
        ))}
      </View>
    </View>
  );
}

export function BarList({ rows, max, format }: { rows: { label: string; value: number; hint?: string }[]; max?: number; format: (v: number) => string }) {
  const m = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ gap: 5 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt variant="subtitle" style={{ fontSize: 14 }}>
              {r.label}
            </Txt>
            <Txt variant="mono" style={{ fontSize: 12 }}>
              {format(r.value)}
              {r.hint ? <Txt variant="small">{`  ${r.hint}`}</Txt> : null}
            </Txt>
          </View>
          <View style={{ height: 12, borderRadius: 6, backgroundColor: colors.sand, overflow: 'hidden' }}>
            <View
              style={{
                width: `${Math.min(100, (r.value / m) * 100)}%`,
                height: '100%',
                backgroundColor: BAR,
                borderRadius: 4,
                borderWidth: r.value ? 1.5 : 0,
                borderColor: colors.ink,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
