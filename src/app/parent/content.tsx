import { useState } from 'react';
import { View } from 'react-native';
import { toast } from '@/components/gamify/Toaster';
import { Button, Chunky, Field, Screen, SectionLabel, Tag, TopBar, Txt } from '@/components/ui';
import { useContent, useContentIndex } from '@/features/content/registry';
import { useRequireParent } from '@/features/profile/parentSession';
import { checkOtaUpdate, cloudSyncConfigured, syncMessage, syncNow } from '@/features/sync/services';
import { standardName, useT } from '@/i18n';
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
  const t = useT();
  if (!ok) return null;
  const when = (at: number) => new Date(at).toLocaleString(t('date.locale'));
  return (
    <Screen header={<TopBar title={t('dash.content')} />}>
      <SectionLabel>{t('content.installed')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ paddingHorizontal: 14, paddingVertical: 6 }}>
        {index.standards.map((s, i) => {
          const topics = s.subjects.reduce((n, x) => n + x.topics.length, 0);
          return (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: colors.line, gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Txt variant="subtitle">{standardName(s, t.lang)}</Txt>
                <Txt variant="small">{t('content.counts', s.subjects.length, topics)}</Txt>
              </View>
              <Tag label={`v${s.version}${remote[s.id] ? ` · ${t('content.downloaded')}` : ''}`} bg={remote[s.id] ? colors.lime : colors.paper} />
            </View>
          );
        })}
      </Chunky>

      <SectionLabel>{t('content.updates')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 12 }}>
        <Txt variant="small">{t('content.help')}</Txt>
        <Field label={t('content.url')} value={url} onChangeText={setUrl} placeholder="https://example.com/bijak-content" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Button
            label={t('content.check')}
            tone="lime"
            loading={checking}
            onPress={async () => {
              setSourceUrl(url);
              const r = await useContent.getState().checkForUpdates();
              toast({ emoji: r.updated.length ? '📦' : '✅', title: r.updated.length ? t('content.updated', r.updated.join(', ')) : t('content.upToDate') });
            }}
          />
          {Object.keys(remote).length > 0 && <Button label={t('content.builtIn')} tone="paper" onPress={clearRemote} />}
        </View>
        {lastCheckedAt ? <Txt variant="small">{t('content.lastChecked', when(lastCheckedAt))}</Txt> : null}
        {lastError ? (
          <Txt variant="small" style={{ color: colors.berry }}>
            {lastError}
          </Txt>
        ) : null}
        <Button
          label={t('content.ota')}
          tone="paper"
          size="sm"
          onPress={async () => setOtaMsg(t(({ none: 'content.ota.none', downloaded: 'content.ota.downloaded', disabled: 'content.ota.disabled' } as const)[await checkOtaUpdate()]))}
        />
        {otaMsg ? <Txt variant="small">{otaMsg}</Txt> : null}
      </Chunky>

      <SectionLabel>{t('content.backup')}</SectionLabel>
      <Chunky depth={3} innerStyle={{ padding: 14, gap: 10 }}>
        {cloudSyncConfigured() ? (
          <>
            <Txt variant="small">{t('content.backupHelp')}</Txt>
            <Txt variant="subtitle">{syncedAt ? t('content.lastBackup', when(syncedAt)) : t('content.notBackedUp')}</Txt>
            <Button label={t('content.backupNow')} tone="lime" size="sm" onPress={async () => setSyncMsg(syncMessage(await syncNow(), t.lang))} />
            {syncMsg ? <Txt variant="small">{syncMsg}</Txt> : null}
          </>
        ) : (
          <Txt variant="small">{t('content.offlineOnly')}</Txt>
        )}
      </Chunky>
    </Screen>
  );
}
