import { useState } from 'react';
import { View } from 'react-native';
import { toast } from '@/components/gamify/Toaster';
import { Button, Chunky, Field, Screen, SectionLabel, Tag, TopBar, Txt } from '@/components/ui';
import { useContent, useContentIndex } from '@/features/content/registry';
import { useRequireParent } from '@/features/profile/parentSession';
import { checkOtaUpdate, cloudSyncConfigured, syncNow } from '@/features/sync/services';
import { useApp } from '@/store/app';
import { colors } from '@/theme';

/** Module 3 + 2 controls: syllabus payload updates, OTA updates and cloud backup. */
export default function ContentScreen() {
  const ok = useRequireParent();
  const index = useContentIndex();
  const { sourceUrl, setSourceUrl, checking, lastCheckedAt, lastError, remote, clearRemote } = useContent();
  const syncedAt = useApp((s) => s.syncedAt);
  const [url, setUrl] = useState(sourceUrl);
  const [syncMsg, setSyncMsg] = useState('');
  const [otaMsg, setOtaMsg] = useState('');
  if (!ok) return null;
  return (
    <Screen header={<TopBar title="Content & sync" />}>
      <SectionLabel>Installed syllabus</SectionLabel>
      <Chunky depth={3} innerStyle={{ paddingHorizontal: 14, paddingVertical: 6 }}>
        {index.standards.map((s, i) => {
          const topics = s.subjects.reduce((n, x) => n + x.topics.length, 0);
          return (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: colors.line, gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Txt variant="subtitle">{s.title}</Txt>
                <Txt variant="small">
                  {s.subjects.length} subjects · {topics} topics
                </Txt>
              </View>
              <Tag label={`v${s.version}${remote[s.id] ? ' · downloaded' : ''}`} bg={remote[s.id] ? colors.lime : colors.paper} />
            </View>
          );
        })}
      </Chunky>

      <SectionLabel>Syllabus updates</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 12 }}>
        <Txt variant="small">
          Point Bijak at a folder containing manifest.json and standards/*.json (e.g. a GitHub raw URL, Supabase Storage or any static host). New or updated standards download in
          the background — no app store update needed.
        </Txt>
        <Field label="Content URL" value={url} onChangeText={setUrl} placeholder="https://example.com/bijak-content" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Button
            label="Save & check now"
            tone="lime"
            loading={checking}
            onPress={async () => {
              setSourceUrl(url);
              const r = await useContent.getState().checkForUpdates();
              toast({ emoji: r.updated.length ? '📦' : '✅', title: r.updated.length ? `Updated: ${r.updated.join(', ')}` : 'Syllabus is up to date' });
            }}
          />
          {Object.keys(remote).length > 0 && <Button label="Use built-in only" tone="paper" onPress={clearRemote} />}
        </View>
        {lastCheckedAt ? <Txt variant="small">Last checked {new Date(lastCheckedAt).toLocaleString()}</Txt> : null}
        {lastError ? (
          <Txt variant="small" style={{ color: colors.berry }}>
            {lastError}
          </Txt>
        ) : null}
        <Button
          label="Check for app update (OTA)"
          tone="paper"
          size="sm"
          onPress={async () =>
            setOtaMsg(
              { none: 'App is up to date.', downloaded: 'Update downloaded — it applies next launch.', disabled: 'OTA updates are off in this build (enable with EAS Update).' }[
                await checkOtaUpdate()
              ],
            )
          }
        />
        {otaMsg ? <Txt variant="small">{otaMsg}</Txt> : null}
      </Chunky>

      <SectionLabel>Cloud backup</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 10 }}>
        {cloudSyncConfigured() ? (
          <>
            <Txt variant="small">Progress is saved on this device first and backed up to your Supabase project whenever you’re online.</Txt>
            <Txt variant="subtitle">{syncedAt ? `Last backup: ${new Date(syncedAt).toLocaleString()}` : 'Not backed up yet'}</Txt>
            <Button label="Back up now" tone="lime" size="sm" onPress={async () => setSyncMsg((await syncNow()).message)} />
            {syncMsg ? <Txt variant="small">{syncMsg}</Txt> : null}
          </>
        ) : (
          <Txt variant="small">
            Everything is stored offline on this device. To enable cloud backup, set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see docs/SETUP.md).
          </Txt>
        )}
      </Chunky>
    </Screen>
  );
}
