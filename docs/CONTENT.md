# Writing Bijak content

All lessons and quizzes live in JSON under `content/`. Nothing about a subject, topic or
question is hard-coded in the app, so you can add Standard 7, a new subject (e.g. Sejarah
or Pendidikan Islam) or new quizzes without touching TypeScript.

```
content/
  manifest.json            # lists every standard + its version
  standards/std3.json      # one file per standard
```

Run `npm run validate-content` after every edit. It checks the schema and cross-references:

- answers exist, blank counts match, and every blank answer is in the word bank;
- ids are unique within a standard **and across all standards** (progress is keyed by id);
- multiple-choice options look different (case counts: "The cat" ≠ "the cat"), sort items
  and vocab words/meanings are unique, and an order distractor is never a real token;
- blanks are exactly `___`, a `count` is never larger than the question pool, arcade games
  are time attacks, and place-value numbers stay within 7 digits (millions).

`npm test` then goes further: every question is built with many seeds and answered through
the real UI, and every lesson is rendered (see `docs/TESTING.md`).

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

## Teaching language: Maths & Science in Bahasa Melayu

Schools teach Maths and Science either in English (DLP classes) or in Bahasa Melayu, so
each child has a **teaching language** (Parent zone → Children). A standard carries the
Bahasa Melayu text of its English subjects in a `translations` overlay — the same topics,
quizzes, ids and answers, only the words change — so stars, mastery and review cards carry
over when a parent switches language.

```jsonc
"translations": {
  "ms": {
    "subjects": {
      "math": {
        "name": "Matematik",
        "topics": {
          "s3-math-money": {
            "title": "Wang hingga RM1000",
            "objectives": [{ "code": "4.1", "text": "Mewakilkan nilai wang hingga RM1000" }],
            "offlineActivity": "…",
            "lesson": [ /* the whole lesson, in BM */ ],
            "quizzes": {
              "s3-math-money-q1": {
                "title": "Kedai runcit",
                "questions": {
                  "q1": { "prompt": "Berapakah sen dalam RM3?" },
                  "q5": { "prompt": "Bolehkah kamu membelinya dengan RM10?", "buckets": { "yes": "Boleh", "no": "Terlalu mahal" } }
                }
              }
            }
          }
        }
      }
    },
    "arcade": { "s3-arcade-times": "Kilat Sifir" }
  }
}
```

Per question you may translate `prompt`, `explain` and the words the child sees:
`options` (by option id), `pairs` (same count, same order), `tokens`/`distractors` (the
correct order in BM), `buckets` (by bucket id), `items` (same count, same order),
`text`/`blanks`/`bank` (fill-in-the-blank) and `unit`. Generated quizzes need only a
`title`: their questions switch to BM wording automatically (KSSR terms such as *nilai
tempat*, *sa/puluh/ratus/ribu*, *baki wang*).

`npm run validate-content` rejects a translation that points at an unknown id, changes
the number of pairs/items/blanks, or breaks any normal rule once applied (e.g. a blank
missing from the word bank), and lists anything still in English under each standard
(`↳ ms: math, science` means complete). Numbers, units, ringgit amounts and emoji don't
need translating.

## Publishing updates without an app release

1. Host the `content/` folder anywhere static (GitHub raw, Supabase Storage, Netlify…).
2. Bump the standard's `version` in both its file and `manifest.json`.
3. In the app: **Parent zone → Content & sync → Content URL** (or set
   `EXPO_PUBLIC_CONTENT_URL` at build time). Devices download and validate newer standards
   in the background; invalid payloads (or ids that clash with another standard) are
   rejected as a whole and the current copy stays in use.

## KSSR alignment

Standard 3 content follows **KSSR (Semakan 2017)**, which Year 2–6 pupils still use in
2026 (KP2027 starts with Year 1 in 2027). Unit lists match the Year 3 textbooks (e.g.
Science units 1–10: Kemahiran Saintifik → Mesin Ringkas; Mathematics topics 1–9). The
`objectives[].code` values follow each unit's numbering; check them against your child's
DSKP / textbook if you need exact learning-standard codes.
