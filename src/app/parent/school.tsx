import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Chip, Screen, SectionLabel, TopBar, Txt } from '@/components/ui';
import { useContentIndex } from '@/features/content/registry';
import { useRequireParent } from '@/features/profile/parentSession';
import { useApp } from '@/store/app';

/** Parents pin the topic each subject's class is on this week; Bijak then practises it first. */
export default function SchoolTopics() {
  const ok = useRequireParent();
  const { child } = useLocalSearchParams<{ child?: string }>();
  const profile = useApp((s) => s.profiles.find((p) => p.id === child) ?? s.profiles[0]);
  const setSchoolTopic = useApp((s) => s.setSchoolTopic);
  const index = useContentIndex(profile?.medium);
  if (!ok) return null;
  const standard = profile && index.standardByLevel(profile.level);
  return (
    <Screen header={<TopBar title="At school now" />}>
      {profile && standard ? (
        <>
          <Txt variant="body">
            {`Which topic is ${profile.name}’s class on in ${standard.title}? Bijak will practise it first and set quests for it. Check the textbook or homework, and update it when the class moves on.`}
          </Txt>
          {standard.subjects.map((subject) => {
            const pinned = profile.schoolTopics?.[subject.id];
            return (
              <View key={subject.id}>
                <SectionLabel>{`${subject.emoji} ${subject.name}`}</SectionLabel>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Chip label="Not sure" selected={!pinned} onPress={() => setSchoolTopic(profile.id, subject.id, null)} />
                  {subject.topics.map((t) => (
                    <Chip key={t.id} label={`${t.emoji} ${t.title}`} selected={pinned === t.id} onPress={() => setSchoolTopic(profile.id, subject.id, t.id)} />
                  ))}
                </View>
              </View>
            );
          })}
        </>
      ) : (
        <Txt variant="body">No learner to set up yet.</Txt>
      )}
    </Screen>
  );
}
