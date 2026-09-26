import { Redirect } from 'expo-router';
import { useApp } from '@/store/app';

/** Entry gate: first run → onboarding, no child selected → profile picker, else home. */
export default function Index() {
  const parent = useApp((s) => s.parent);
  const profiles = useApp((s) => s.profiles);
  const active = useApp((s) => s.activeProfileId);
  if (!parent || profiles.length === 0) return <Redirect href="/onboarding" />;
  if (!active || !profiles.some((p) => p.id === active)) return <Redirect href="/profiles" />;
  return <Redirect href="/home" />;
}
