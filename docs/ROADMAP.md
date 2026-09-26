# Bijak roadmap

What to improve next, most valuable first. Items move to "Done" as they land on `main`.

## Now

- [x] **Bahasa Melayu / English app** — every screen, button, message, reminder and the weekly
      report in both languages, with a switch in onboarding, Me and Parent › Settings. Lessons and
      quizzes keep following each child's school language.
- [x] **Automatic checks on GitHub** — every pull request runs `npm run verify` (typecheck, lint,
      content validation, the full test suite with coverage), so a broken change can't reach `main`.
- [ ] **Review my mistakes** — after a quiz, the questions answered wrongly with the right answer
      and the explanation, right on the results screen.
- [ ] **Printable practice sheets** — from the parent zone, a PDF of questions for any topic (or
      the report's weak spots) with an answer key, for practice away from the screen.
- [ ] **Hints** — a hint button before answering (from the question's explanation) for a smaller
      reward, so a stuck child can keep going instead of guessing.

## Next

- [ ] **Standard 4 content**, in both languages (Maths and Science first), ready before the new
      school year.
- [ ] **Smart practice** — quizzes built from a child's weakest facts (e.g. the 7× and 8× tables
      they keep missing), not just whole topics.
- [ ] **Healthy screen time** — an optional daily limit and a gentle "time for a break" after a set
      number of minutes, both chosen by a parent.
- [ ] **Mastery levels in the report** — an estimated *Tahap Penguasaan* (TP1–6) per topic, clearly
      labelled as an estimate, in the terms schools use for PBD.

## Later

- [ ] Fuller content for Standards 1–2 and 5–6.
- [ ] Sang Kancil story mode: short stories for reading and listening, in BM and English.
- [ ] Seasonal themes (Merdeka, Hari Raya) in the shop.
- [ ] Play Store readiness: privacy policy (PDPA), store listing and screenshots, crash reporting.

## Done

- Streaks with rest days and shields, school-matched Maths & Science in Bahasa Melayu, gentle
  reminders, the weekly parent report, and a natural read-aloud voice (PR #3).
- Shop fixes, hardened business rules and the full test suite (PR #2).
