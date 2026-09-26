/**
 * Business invariants that must hold for every child after any sequence of actions.
 * Flow and fuzz tests call this after every simulated step.
 */
import { getContentIndex } from '@/features/content/registry';
import { allBadges } from '@/features/gamify/badges';
import { FREE_ITEMS, itemById, SHOP } from '@/features/gamify/shop';
import { SHIELD } from '@/features/gamify/streak';
import { topicStatus } from '@/features/progress/selectors';
import { MASTERED_BOX } from '@/features/srs/srs';
import { dayKey } from '@/lib/date';
import { MAX_ATTEMPTS, MAX_DAYS_KEPT, useApp } from '@/store/app';
import type { Profile, Progress } from '@/store/types';

/**
 * `settled`: the last action was one that awards badges (finishing a quiz or lesson, buying).
 * Answers can meet a badge's condition mid-quiz; the badge is handed out when the quiz ends.
 */
export function checkInvariants(where = '', { settled = false } = {}) {
  const s = useApp.getState();
  const index = getContentIndex();
  const arcadeIds = new Set(index.standards.flatMap((std) => std.arcade.map((g) => `arcade:${g.id}`)));
  const shopIds = new Set(SHOP.map((i) => i.id));
  const badges = new Map(allBadges(index).map((b) => [b.id, b]));
  const fail = (msg: string) => {
    throw new Error(`${where}: ${msg}`);
  };

  expect(new Set(s.profiles.map((p) => p.id)).size).toBe(s.profiles.length);
  if (s.activeProfileId) expect(s.profiles.some((p) => p.id === s.activeProfileId)).toBe(true);
  expect(Object.keys(s.progress).sort()).toEqual(s.profiles.map((p) => p.id).sort());
  if (s.syncedRevision != null) expect(s.syncedRevision).toBeLessThanOrEqual(s.dirtyAt);

  for (const profile of s.profiles) checkChild(profile, s.progress[profile.id], { arcadeIds, shopIds, badges, fail, settled: settled && profile.id === s.activeProfileId });
}

function checkChild(
  profile: Profile,
  p: Progress,
  ctx: { arcadeIds: Set<string>; shopIds: Set<string>; badges: Map<string, { earned: (p: Progress) => boolean }>; fail: (m: string) => never | void; settled: boolean },
) {
  const { fail } = ctx;
  const today = dayKey();
  // Money and experience
  if (!(Number.isInteger(p.coins) && p.coins >= 0)) fail(`coins ${p.coins}`);
  if (!(Number.isInteger(p.xp) && p.xp >= 0)) fail(`xp ${p.xp}`);
  // Inventory and avatar
  if (new Set(p.inventory).size !== p.inventory.length) fail('duplicate inventory');
  for (const id of p.inventory) if (!ctx.shopIds.has(id) && !ctx.arcadeIds.has(id)) fail(`unknown item ${id}`);
  for (const id of FREE_ITEMS) if (!p.inventory.includes(id)) fail(`missing free item ${id}`);
  for (const slot of ['outfit', 'bg', 'hat', 'glasses', 'pet'] as const) {
    const id = profile.avatar[slot];
    if (id === undefined) {
      if (slot === 'outfit' || slot === 'bg') fail(`no ${slot}`);
      continue;
    }
    if (!p.inventory.includes(id)) fail(`wearing unowned ${id}`);
    if (itemById(id)?.slot !== slot) fail(`${id} in wrong slot ${slot}`);
  }
  // School: a known teaching language, and pinned topics from the child's own standard
  if (profile.medium !== undefined && profile.medium !== 'en' && profile.medium !== 'ms') fail(`medium ${String(profile.medium)}`);
  const standard = getContentIndex().standardByLevel(profile.level);
  for (const [subjectId, topicId] of Object.entries(profile.schoolTopics ?? {})) {
    const subject = standard?.subjects.find((s) => s.id === subjectId);
    if (!subject?.topics.some((t) => t.id === topicId)) fail(`school topic ${subjectId}/${topicId} is not in Standard ${profile.level}`);
  }
  // Mastery dates: stamped exactly for mastered topics, never in the future
  for (const [id, st] of Object.entries(p.topics)) {
    const ref = getContentIndex().topic(id);
    const mastered = !!ref && topicStatus(ref.topic, p).mastered;
    if (mastered !== (st.masteredAt !== undefined)) fail(`topic ${id} mastered=${mastered} but masteredAt=${st.masteredAt}`);
    if (st.masteredAt !== undefined && st.masteredAt > Date.now()) fail(`topic ${id} mastered in the future`);
  }
  // Streak
  if (p.streak.current < 0 || p.streak.best < p.streak.current) fail(`streak ${JSON.stringify(p.streak)}`);
  if (p.streak.lastDay && p.streak.lastDay > today) fail('streak in the future');
  if ((p.streak.current > 0) !== (p.streak.lastDay != null)) fail('streak without a day');
  const shields = p.streak.shields ?? 0;
  if (!Number.isInteger(shields) || shields < 0 || shields > SHIELD.max) fail(`shields ${shields}`);
  for (const d of p.streak.shielded ?? []) {
    // A shield only ever covers a school day the child missed, before their last active day.
    if (!p.streak.lastDay || d >= p.streak.lastDay) fail(`shielded ${d} not before last day ${p.streak.lastDay}`);
    if (Object.keys(p.days[d]?.seconds ?? {}).length > 0) fail(`shielded ${d} although the child played`);
  }
  // Quests
  if (p.quests.list.length > 3) fail('too many quests');
  for (const q of p.quests.list) {
    if (q.progress < 0 || q.progress > q.target) fail(`quest progress ${q.progress}/${q.target}`);
    if (q.claimed && q.progress < q.target) fail('claimed an unfinished quest');
  }
  if (p.quests.day && p.quests.day > today) fail('quests from the future');
  // Totals and history
  const t = p.totals;
  if (t.correct > t.answered || t.perfect > t.quizzes || t.reviews > t.correct) fail(`totals ${JSON.stringify(t)}`);
  if (p.attempts.length > MAX_ATTEMPTS) fail('too many attempts kept');
  for (let i = 0; i < p.attempts.length; i++) {
    const a = p.attempts[i];
    if (a.correct < 0 || a.correct > a.total || a.total < 1) fail(`attempt ${a.correct}/${a.total}`);
    if (i && a.at > p.attempts[i - 1].at) fail('attempts out of order');
  }
  if (Object.keys(p.days).length > MAX_DAYS_KEPT) fail('too many days kept');
  for (const d of Object.values(p.days)) if (d.correct > d.answered) fail('day correct > answered');
  for (const [id, st] of Object.entries(p.topics)) {
    if (st.correct > st.answered) fail(`topic ${id} correct > answered`);
    for (const b of Object.values(st.best)) if (b < 0 || b > 100) fail(`topic ${id} best ${b}`);
  }
  // Spaced repetition
  for (const c of Object.values(p.srs)) if (c.box < 0 || c.box >= MASTERED_BOX || c.lapses < 1) fail(`srs card ${c.key} box ${c.box} lapses ${c.lapses}`);
  // Badges: only real badges, and only when deserved (every badge condition is monotonic)
  for (const id of Object.keys(p.badges)) {
    const b = ctx.badges.get(id);
    if (!b) fail(`unknown badge ${id}`);
    else if (!b.earned(p)) fail(`badge ${id} without meeting it`);
  }
  if (ctx.settled) for (const [id, b] of ctx.badges) if (b.earned(p) && !p.badges[id]) fail(`badge ${id} earned but not awarded`);
}
