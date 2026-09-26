This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Bijak project notes

- Curriculum lives in `content/**/*.json`; run `npm run validate-content` after edits. See `docs/CONTENT.md`. Maths & Science also carry a Bahasa Melayu `translations.ms` overlay (same ids and answers): when you add or change English text there, update the BM text too — the validator lists anything left untranslated.
- The app speaks English and Bahasa Melayu (a family setting, `settings.uiLang`, starting from the phone's language). Every word on screen, in notifications and in shared text comes from `src/i18n/messages/*.ts`, written side by side: `s('Continue', 'Teruskan')`, or `f((n: number) => …, (n: number) => …)` when it takes values. Screens use `const t = useT()` then `t('key', …args)`; non-React code takes a `lang` and calls `translate(lang, key, …)`. Never hard-code UI text (a policy test fails), and use `standardName()`/`subjectName()` for syllabus names. Lesson and quiz words — including the engine labels in `components/quiz/types.ts` and the `lesson.*` card labels — follow the lesson's language, not the app's.
- Child screens read the syllabus through `useChildContent()` (the child's teaching language); non-hook code passes the child's `medium` to `getContentIndex()`.
- Read-aloud text goes through `speakable()` in `src/lib/voice.ts`; teach it new symbols or units there rather than special-casing callers.
- Design tokens: `src/theme/tokens.js` (shared with `tailwind.config.js`). Reuse `src/components/ui` (Chunky, Button, Txt…).
- Reanimated shared values: prefer `.set()` in callbacks returned from hooks (React Compiler lint).
- Layout must work from a 320px phone to a landscape tablet: wrap screens in `Screen` (`frame="wide"` for grid screens), use `Grid` instead of fixed `%` widths, `HScroll` for edge-to-edge scrollers, and `useLayout()`/`useFrame()` for size decisions. When a card stretches to its row, pass `style={{ flex: 1 }}` to it.
- Motion must stay calm (see `src/theme/motion.ts`): animate only to confirm an action or mark a rare milestone. No looping/idle animations, staggered list entrances, or bouncy springs — they distract from learning.
- Business rules (prices, level locks, bonuses, streaks) live in `src/store/app.ts` and must not trust input from screens; screens never call `useApp.setState`.
- Tests live in `tests/` (never under `src/app`). See `docs/TESTING.md`; meta tests fail if a new source file, store action, reward rule, badge, route or screen isn't covered.
- Verify with `npm run verify` (typecheck, lint, content validation, tests with coverage thresholds).
