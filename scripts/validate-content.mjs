// Validates every curriculum payload listed in content/manifest.json.
// Run: npm run validate-content  (requires Node >= 22.18 for TypeScript type stripping)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Manifest } from '../src/features/content/schema.ts';
import { translatedSubjects } from '../src/features/content/localize.ts';
import { crossStandardIssues, parseStandard, translationGaps } from '../src/features/content/validate.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
const manifest = Manifest.parse(JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')));

let failed = 0;
const parsed = [];
for (const entry of manifest.standards) {
  try {
    const std = parseStandard(JSON.parse(readFileSync(join(root, entry.file), 'utf8')));
    parsed.push(std);
    if (std.id !== entry.id || std.version !== entry.version || std.level !== entry.level) {
      throw new Error(`manifest entry (id/level/version) does not match ${entry.file}`);
    }
    const topics = std.subjects.reduce((n, s) => n + s.topics.length, 0);
    const questions = std.subjects.flatMap((s) => s.topics.flatMap((t) => t.quizzes)).reduce((n, q) => n + q.questions.length, 0);
    console.log(`✔ ${entry.id}: ${std.subjects.length} subjects, ${topics} topics, ${questions} authored questions`);
    for (const lang of Object.keys(std.translations ?? {})) {
      const gaps = translationGaps(std, lang);
      console.log(`  ↳ ${lang}: ${translatedSubjects(std, lang).join(', ')}${gaps.length ? ` (${gaps.length} untranslated: ${gaps.slice(0, 3).join('; ')}…)` : ''}`);
    }
  } catch (e) {
    failed++;
    console.error(`✘ ${entry.id}: ${e.message}`);
  }
}
for (const issue of crossStandardIssues(parsed)) {
  failed++;
  console.error(`✘ ${issue}`);
}
process.exit(failed ? 1 : 0);
