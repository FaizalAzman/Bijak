import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Chip, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { useContentIndex } from '@/features/content/registry';
import { useRequireParent } from '@/features/profile/parentSession';
import { standardName, useT } from '@/i18n';
import { useApp } from '@/store/app';

/** Parents pin the topic each subject's class is on this week; Bijak then practises it first. */
export default function SchoolTopics() {
  const ok = useRequireParent();
  const { child } = useLocalSearchParams<{ child?: string }>();
  const profile = useApp((s) => s.profiles.find((p) => p.id === child) ?? s.profiles[0]);
  const setSchoolTopic = useApp((s) => s.setSchoolTopic);
  const index = useContentIndex(profile?.medium);
  const t = useT();
  if (!ok) return null;
  const standard = profile && index.standardByLevel(profile.level);
  return (
    <Screen header={<TopBar title={t('dash.school')} />}>
      {profile && standard ? (
        <>
          <Txt variant="body">
            {t('school.intro', profile.name, standardName(standard, t.lang))}
          </Txt>
          {standard.subjects.map((subject) => {
            const pinned = profile.schoolTopics?.[subject.id];
            return (
              <View key={subject.id}>
                <SectionLabel>{`${subject.emoji} ${subject.name}`}</SectionLabel>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Chip label={t('school.notSure')} selected={!pinned} onPress={() => setSchoolTopic(profile.id, subject.id, null)} />
                  {subject.topics.map((topic) => (
                    <Chip key={topic.id} label={`${topic.emoji} ${topic.title}`} selected={pinned === topic.id} onPress={() => setSchoolTopic(profile.id, subject.id, topic.id)} />
                  ))}
                </View>
              </View>
            );
          })}
        </>
      ) : (
        <Txt variant="body">{t('school.noLearner')}</Txt>
      )}
    </Screen>
  );
}
