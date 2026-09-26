# Setup & deployment

## Run it

```bash
npm install
npx expo start          # scan the QR code with Expo Go (Android/iOS)
npx expo start --web    # browser preview
```

Every native module Bijak uses ships in Expo Go (SQLite, SecureStore, audio, speech,
haptics, Reanimated, Gesture Handler, SVG), so no custom dev build is needed to try it.

Checks: `npm run typecheck`, `npm run lint`, `npm run validate-content`.

## Environment variables (all optional)

Create `.env.local`:

```
EXPO_PUBLIC_CONTENT_URL=https://raw.githubusercontent.com/<you>/<repo>/main/content
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

- **Content URL**: remote syllabus updates (see `docs/CONTENT.md`).
- **Supabase**: cloud backup of each child's progress. Run `docs/supabase.sql` first.
  Rows are isolated per family by a random key stored in the device keychain.

Without these the app is 100% offline; all data lives in on-device SQLite.

## Building & over-the-air updates (EAS)

```bash
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile preview --platform android   # installable APK
npx eas-cli@latest update:configure                              # enables expo-updates
npx eas-cli@latest update --branch production --message "New Std 4 content"
```

Once EAS Update is configured, the app downloads JS/asset updates in the background and
applies them on next launch (Parent zone → Content & sync → "Check for app update").
