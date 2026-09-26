# Writing Bijak content

All lessons and quizzes live in JSON under `content/`. Nothing about a subject, topic or
question is hard-coded in the app, so you can add Standard 7, a new subject (e.g. Sejarah
or Pendidikan Islam) or new quizzes without touching TypeScript.

```
content/
  manifest.json            # lists every standard + its version
  standards/std3.json      # one file per standard
```

Run `npm run validate-content` after every edit. It checks the schema and cross-references
(answers exist, blank counts match, ids are unique).

## Structure

```jsonc
{
  "id": "std3", "level": 3, "title": "Standard 3", "titleAlt": "Tahun 3",
  "version": 1,                         // bump when you change the file
  "subjects": [{
    "id": "math", "name": "Mathematics", "nameAlt": "Matematik",
    "emoji": "🔢", "color": "lime",     // lime | grape | tangerine | mint | sky | sun | berry
    "lang": "en",                       // en | ms (voice + UI labels)
    "topics": [{
      "id": "s3-math-numbers",          // globally unique, kebab-case
      "title": "Numbers up to 10 000", "titleAlt": "Nombor Bulat hingga 10 000",
      "emoji": "🧮",
      "objectives": [{ "code": "1.1", "text": "Name and write numbers up to 10 000" }],
      "offlineActivity": "Shown to parents when the child struggles here.",
      "lesson": [ /* lesson blocks */ ],
      "quizzes": [ /* quizzes */ ]
    }]
  }],
  "arcade": [ /* time-attack games shown on Home; price > 0 = unlock in shop */ ]
}
```

## Lesson blocks

| type | fields |
|---|---|
| `heading` | `text` |
| `text` | `text` — supports `**bold**` and `==highlight==` |
| `callout` | `text`, `emoji?`, `tone`: `tip` / `remember` / `fun` |
| `list` | `items[]`, `ordered?` |
| `math` | `expr`, `caption?` |
| `fraction` | `numerator`, `denominator`, `caption?` |
| `example` | `title?`, `lines[]` |
| `vocab` | `lang`, `items[{ word, meaning, emoji? }]` (tap to hear) |
| `table` | `headers[]`, `rows[][]` |
| `placeValue` | `number` |
| `numberLine` | `from`, `to`, `step`, `highlight[]` |
| `image` | `emoji`, `caption?` |
| `emojiGrid` | `emoji`, `rows`, `cols`, `caption?` |
| `say` | `text`, `lang` (read-aloud button) |

A new card starts at every `heading` (or after 4 blocks).

## Questions

Every question has `id`, `type`, `prompt`, and optionally `visual` (emoji), `lang`,
`difficulty` (1–3), `explain`, `objective` (KSSR code).

| type | extra fields | how the child answers |
|---|---|---|
| `mcq` | `options[{id,text?,emoji?}]`, `answer` (option id) | tap |
| `trueFalse` | `answer: true/false` | tap Betul/Salah |
| `match` | `pairs[{left,right}]` (2–5) | draw lines between pairs |
| `order` | `tokens[]` in correct order, `distractors[]?` | tap/drag words into order |
| `sort` | `buckets[{id,label,emoji?}]`, `items[{text,bucket}]` | drag into groups |
| `fillBlank` | `text` with `___` per blank, `blanks[]`, `bank[]` | tap/drag from word bank |
| `numpad` | `answer` (numeric string), `unit?` | on-screen keypad |

## Generated quizzes

Instead of `questions`, a quiz can use a `generator` for endless practice:

```json
{ "id": "s3-math-operations-q2", "title": "Times tables 6–9", "count": 10,
  "generator": { "kind": "multiplication", "tables": [6, 7, 8, 9] } }
```

Kinds: `multiplication`, `division`, `addition`, `subtraction`, `compare`, `placeValue`,
`money`, `vocab` (with `pairs: [["word","meaning"], …]`). Set `"mode": "timeAttack"` and
`"seconds": 60` for a race against the clock.

## Publishing updates without an app release

1. Host the `content/` folder anywhere static (GitHub raw, Supabase Storage, Netlify…).
2. Bump the standard's `version` in both its file and `manifest.json`.
3. In the app: **Parent zone → Content & sync → Content URL** (or set
   `EXPO_PUBLIC_CONTENT_URL` at build time). Devices download and validate newer standards
   in the background; invalid payloads are rejected and the bundled copy stays in use.

## KSSR alignment

Standard 3 content follows **KSSR (Semakan 2017)**, which Year 2–6 pupils still use in
2026 (KP2027 starts with Year 1 in 2027). Unit lists match the Year 3 textbooks (e.g.
Science units 1–10: Kemahiran Saintifik → Mesin Ringkas; Mathematics topics 1–9). The
`objectives[].code` values follow each unit's numbering; check them against your child's
DSKP / textbook if you need exact learning-standard codes.
