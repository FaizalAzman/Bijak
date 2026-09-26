# Bijak 🦌

A gamified KSSR learning app for Malaysian primary pupils (Standard 1–6), built with Expo
(SDK 57) and React Native. **Sang Kancil**, the clever mousedeer of Malay folklore, guides
children through Mathematics, Science, English and Bahasa Melayu lessons, quizzes and
time-attack games. A PIN-protected Parent Zone shows where they need help.

- 32 Standard 3 topics / 135 hand-written questions aligned to **KSSR (Semakan 2017)**, the curriculum Year 3 uses in 2026
- Starter content for Standards 1, 2, 4, 5 and 6; every standard is plain JSON, so Standard 7 is just another file
- The whole app in **Bahasa Melayu or English** — buttons, messages, reminders and the weekly report — switchable any time
- Maths & Science in **English (DLP) or Bahasa Melayu**, set per child to match their school; progress carries across both
- Parents pin the topic each class is on this week; Bijak practises it first and sets quests for it
- Streaks that forgive real life: family rest days and rest-day shields
- Gentle, parent-controlled reminders and a **weekly report** to share on WhatsApp
- Read-aloud in the most natural voice on the device, reading maths the way a teacher would
- Endless generated practice (times tables, place value, money, vocabulary…)
- Works fully offline, with optional cloud backup and over-the-air content updates

## Quick start

```bash
npm install
npx expo start      # open in Expo Go
```

See [`docs/SETUP.md`](docs/SETUP.md) for builds, env vars and cloud sync, and
[`docs/CONTENT.md`](docs/CONTENT.md) to add lessons, questions or a new standard.

## Testing

```bash
npm test          # 2,300+ unit, component, flow and meta tests
npm run verify    # typecheck + lint + content validation + tests with coverage thresholds
```

Every business rule (rewards, streaks, shop, PIN lockout, sync) is enforced by the store and
covered by tests, and meta tests check the whole curriculum, every screen and every link.
See [`docs/TESTING.md`](docs/TESTING.md).

## Architecture: the 20 modules

| # | Module | Where |
|---|---|---|
| 1 | Expo Router file-based navigation & deep links (`bijak://quiz/<id>`) | `src/app/` |
| 2 | Local-first state (Zustand persisted to on-device **SQLite**) + cloud sync when online | `src/store/app.ts`, `src/lib/storage.ts`, `src/features/sync/services.ts` |
| 3 | Dynamic content delivery: bundled JSON + remote manifest, validated & cached; Expo Updates | `src/features/content/registry.ts` |
| 4 | Parent account + child profiles, PIN hashed in **SecureStore** | `src/app/onboarding.tsx`, `src/lib/secure.ts` |
| 5 | Telemetry: crash handler, error boundary, screen load times, dropped-frame bursts per quiz engine | `src/lib/telemetry.ts`, Parent ▸ App health |
| 6 | KSSR syllabus model: Standard → Subject → Topic (objectives) → Lesson + Quizzes (zod-validated) | `src/features/content/schema.ts` |
| 7 | Spaced repetition (Leitner boxes) for every missed question | `src/features/srs/srs.ts`, `/quiz/review` |
| 8 | Audio: SFX via `expo-audio`, read-aloud in English/BM via on-device TTS (`expo-speech`) with the best installed voice and teacher-style speech text | `src/lib/feedback.ts`, `src/lib/voice.ts` |
| 9 | Lesson parser: rich text, maths, fractions, place-value charts, number lines, emoji arrays | `src/components/lesson/` |
| 10 | MCQ engine (text/emoji, instant validation, shake) | `src/components/quiz/MCQ.tsx` |
| 11 | Gesture matching: draw lines between pairs | `src/components/quiz/Match.tsx` |
| 12 | Drag & drop: sentence building, sorting into buckets | `src/components/quiz/{DnD,Order,Sort}.tsx` |
| 13 | Fill in the blanks with a word bank (no keyboard) + numeric keypad | `src/components/quiz/{FillBlank,Numpad}.tsx` |
| 14 | Time-attack mode with depleting timer bar | `src/components/quiz/TimerBar.tsx`, arcade games |
| 15 | XP & levels with tiers and level-up celebration | `src/features/gamify/xp.ts` |
| 16 | Streaks with rest days & shields; 3 seeded daily quests that reset at midnight and follow the school topics | `src/features/gamify/{streak,quests}.ts` |
| 17 | Coins & shop (cosmetics + unlockable arcade games) | `src/features/gamify/shop.ts`, Shop tab |
| 18 | SVG avatar builder that reacts to progress (excited / happy / sleepy) | `src/components/avatar/` |
| 19 | Badges & trophy room, incl. auto-generated "Standard N Subject Master" badges | `src/features/gamify/badges.ts` |
| 20 | Parent analytics: time per day/subject, accuracy, weak KSSR topics + offline activities; weekly report to share | `src/app/parent/`, `src/features/insights/` |
| 21 | Gentle reminders: local notifications planned on the device, parent-controlled | `src/features/reminders/` |
| 22 | Teaching language: Bahasa Melayu overlays for Maths & Science, same ids and answers | `src/features/content/localize.ts`, `content/standards/*.json` |
| 23 | Bilingual UI: every message in English and Bahasa Melayu side by side, a family language setting | `src/i18n/` |

What's next: [`docs/ROADMAP.md`](docs/ROADMAP.md).

**Design:** NativeWind (Tailwind) tokens in `src/theme/tokens.js`; chunky neo-brutalist
cards with hard ink shadows; Fredoka display + Plus Jakarta Sans body; Expo Haptics on
every interaction. Motion is deliberately calm (`src/theme/motion.ts`): animation only
confirms an action (press, right/wrong, drag, progress) or marks a rare milestone; no
looping decoration or staggered entrances, and the device's Reduce Motion setting is honoured.
Layouts adapt to the screen (`src/hooks/useLayout.ts`, `Grid`, `Screen frame`): tighter
spacing on small phones, 2–5 column grids and two-column Home on tablets, and tablets can
rotate while phones stay in portrait.
