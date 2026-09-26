/** Small filesystem helpers for meta tests that read the source tree. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const ROOT = join(__dirname, '..', '..');

export function walk(dir: string, match: RegExp = /\.(ts|tsx)$/): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, match));
    else if (match.test(name)) out.push(full);
  }
  return out.sort();
}

export const rel = (file: string) => relative(ROOT, file).split('\\').join('/');
export const read = (file: string) => readFileSync(file, 'utf8');
export const srcFiles = () => walk(join(ROOT, 'src'));
export const testFiles = () => walk(join(ROOT, 'tests'));

/** Every screen file under src/app (layouts excluded; special screens like +not-found included). */
export function screens() {
  return walk(join(ROOT, 'src', 'app')).filter((file) => !/_layout\.tsx?$/.test(file));
}

/** Navigable routes under src/app, mapped to URL patterns. */
export function routes() {
  return screens()
    .map((file) => {
      const path = rel(file).replace(/^src\/app\//, '').replace(/\.tsx?$/, '');
      return { file, path };
    })
    .filter(({ path }) => !path.split('/').some((seg) => seg.startsWith('+')))
    .map(({ file, path }) => {
      const url = `/${path
        .split('/')
        .filter((seg) => !/^\(.*\)$/.test(seg))
        .join('/')}`.replace(/\/index$/, '').replace(/^$/, '/');
      const pattern = new RegExp(`^${(url || '/').replace(/\[[^\]]+\]/g, '[^/]+')}$`);
      return { file, path, url: url || '/', pattern };
    });
}
