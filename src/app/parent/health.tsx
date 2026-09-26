import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { BarList } from '@/components/parent/Charts';
import { Button, Chunky, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { useRequireParent } from '@/features/profile/parentSession';
import { telemetry } from '@/lib/telemetry';
import { colors } from '@/theme';

/** Module 5 — local crash & performance report. */
export default function Health() {
  const ok = useRequireParent();
  const [v, setV] = useState(0);
  const records = useMemo(() => telemetry.records(), [v]); // eslint-disable-line react-hooks/exhaustive-deps
  const errors = records.filter((r) => r.kind === 'error').reverse();
  const screens = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const r of records) {
      if (r.kind !== 'screen') continue;
      // Screens with ids in the path (e.g. /quiz/<uuid>) are grouped together.
      const key = r.name.replace(/\/[^/]*[0-9a-f-]{8,}[^/]*/g, '/:id');
      m.set(key, [...(m.get(key) ?? []), Number(r.data?.loadMs ?? 0)]);
    }
    return [...m.entries()]
      .map(([label, xs]) => ({ label, value: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length), hint: `(${xs.length}×)` }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [records]);
  const jank = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of records) if (r.kind === 'jank') m.set(r.name, (m.get(r.name) ?? 0) + Number(r.data?.longFrames ?? 0));
    return [...m.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [records]);
  if (!ok) return null;
  return (
    <Screen header={<TopBar title="App health" />}>
      <Txt variant="small">Collected on this device only. Nothing is sent anywhere unless you add a telemetry sink.</Txt>
      <SectionLabel>Slowest screens · avg load</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14 }}>
        {screens.length ? <BarList rows={screens} format={(n) => `${n} ms`} /> : <Txt variant="small">No data yet.</Txt>}
      </Chunky>
      <SectionLabel>Dropped frames by feature</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14 }}>
        {jank.length ? <BarList rows={jank} format={(n) => `${n} long frames`} /> : <Txt variant="small">Smooth so far — no jank bursts recorded. 🎉</Txt>}
      </Chunky>
      <SectionLabel>{`Errors (${errors.length})`}</SectionLabel>
      <View style={{ gap: 10 }}>
        {errors.length === 0 && (
          <Chunky depth={3} bg={colors['mint-soft']} innerStyle={{ padding: 14 }}>
            <Txt variant="subtitle">No crashes recorded ✅</Txt>
          </Chunky>
        )}
        {errors.slice(0, 10).map((e) => (
          <Chunky key={e.at + e.name} depth={2} innerStyle={{ padding: 12, gap: 4 }}>
            <Txt variant="subtitle" style={{ fontSize: 14 }}>
              {e.name}
            </Txt>
            <Txt variant="small">
              {new Date(e.at).toLocaleString()} · {String(e.data?.context ?? '')}
            </Txt>
          </Chunky>
        ))}
      </View>
      <View style={{ marginTop: 20 }}>
        <Button
          label="Clear report"
          tone="paper"
          size="sm"
          onPress={() => {
            telemetry.clear();
            setV((x) => x + 1);
          }}
        />
      </View>
    </Screen>
  );
}
