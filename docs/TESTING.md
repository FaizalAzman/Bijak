# Testing

```bash
npm test                # 1,200+ tests, ~25 s
npm run test:coverage   # same, with coverage thresholds enforced
npm run verify          # typecheck + lint + content validation + tests with coverage
```

Tests live in `tests/` (never in `src/app`, where every file would become a route). Jest runs
with `jest-expo`, React Native Testing Library 14 (async `render`/`fireEvent`), and fakes for
every native module in `tests/setup/mocks.ts`, so each test file starts on an empty "device".
The clock is frozen in Malaysian time (`Asia/Kuala_Lumpur`, no daylight saving), so streak and
daily-quest tests are deterministic.

## Layers

| Folder | What it proves |
| --- | --- |
| `tests/unit` | Every logic module on its own: XP curve, quests, badges, SRS, selectors, insights, content schema/validation, generators (checked by an independent answer oracle, `tests/oracle.ts`), registry and OTA content updates, PIN security, sync, telemetry, feedback, layout. |
| `tests/store` | The business rules in `src/store/app.ts`: rewards, bonuses, streaks, lessons, quests, shop, avatar, profiles, persistence. |
| `tests/components` | Question engines driven through the accessible UI, the Shop (buy/equip/level locks, Buy-button layout on phone and tablet), quiz screen end to end (practice, review, time attack), Parent Zone PIN lockout, onboarding and other screen flows. |
| `tests/flows` | Business simulations: a three-week journey, economy guardrails (pacing and anti-farming), OTA syllabus updates, and property-based fuzzing — thousands of random actions, including garbage input, with every invariant (`tests/flows/invariants.ts`) checked after each step. |
| `tests/meta` | Tests about the codebase and the suite itself (below). |

## Meta tests

- **Curriculum**: every quiz in every standard is built with 20 seeds; every question must pass the schema and semantic checks, generated answers must match the oracle, ids must be unique across standards, and questions must use their subject's language.
- **Answerable**: every question a child can meet is rendered in its real engine and answered through the accessible UI — the right answer must be accepted and a wrong one rejected, exactly once.
- **Renderers**: every lesson-block and question type in the schema has a renderer; every lesson in the syllabus renders; every shop item visibly changes the avatar; every badge appears in the trophy room.
- **Screens**: every file in `src/app` renders on a phone and a tablet with no crash, no `undefined`/`NaN` on screen, and a name on every button.
- **Routes**: every `router.push`/`replace`/`href` points at a real screen, and no screen is orphaned.
- **Policy**: the AGENTS.md rules — calm motion, `Grid` instead of `%` widths, `Screen` on every screen, roles on every `Pressable`, network access only in the registry and sync service, no direct store writes from UI.
- **Suite**: every source file is loaded by some test, no `.only`/`.skip`, every test file asserts, no unseeded randomness, and every store action, reward rule and badge is exercised.

## Business rules the store enforces

The UI is never trusted: the store checks everything itself.

- Prices and level locks come from the catalogue/syllabus; coins never go negative; items can't be bought twice.
- The syllabus decides what a quiz is (practice, time attack) and where it belongs; unknown quiz or topic ids earn nothing.
- Completion and perfect bonuses need at least `REWARDS.minBonusQuestions` questions and pay once per quiz per day (a retry that turns perfect still earns the perfect bonus). Time attacks pay per correct answer plus a bonus for a new best.
- First lesson read pays the lesson reward; re-reads earn a little XP once per topic per day.
- Streaks count calendar days with a finished quiz or lesson; quests roll over at local midnight.
- Spaced repetition never promotes a card before it's due (no cramming).
- Only owned items can be worn; outfit and background can't be removed; resetting a child's progress also takes off bought items.
- The parent PIN locks after every 5 wrong tries (30 s, doubling to 15 min), persisted across restarts; changing it needs the new PIN twice.
- Cloud sync marks exactly the uploaded snapshot as synced, so changes made during an upload are never lost.

## Writing tests

- Use the helpers in `tests/helpers.ts` (`setNow`, `advanceDays`, `setupChild`, `playQuiz`, `patchProgress`…) and `tests/solve.ts` to answer any question through the UI.
- Query by role and accessible name (`getByRole('button', { name })`); if you can't, the UI probably needs an accessibility label.
- New store action, reward rule or badge? The suite meta test fails until a test mentions it.
