import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Sonner 2.0.8: an update must explicitly review and approve its emitted CSS.
const reviewedStyleHash = 'sha256-StEaX+se6YS7pqjzrzMIA0KaX9zF/8zAhvQXZAe5epY=';

/** Permit only Sonner's exact emitted stylesheet, never arbitrary inline CSS. */
export function sonnerStyleHash() {
  const entry = createRequire(import.meta.url).resolve('sonner');
  const source = readFileSync(entry, 'utf8');
  const encoded = /__insertCSS\(("(?:\\.|[^"\\])*")\);/.exec(source)?.[1];

  if (encoded === undefined)
    throw new Error('Sonner CSS emission changed; review its CSP integration.');

  const css: unknown = JSON.parse(encoded);

  if (typeof css !== 'string') throw new Error('Sonner stylesheet must be a literal string.');

  const hash = `sha256-${createHash('sha256').update(css).digest('base64')}`;

  if (hash !== reviewedStyleHash)
    throw new Error('Sonner stylesheet changed; review its CSP hash.');
  return `'${hash}'`;
}

/** Sonner first appends an empty style element, then inserts its hashed CSS. */
export function emptyStyleHash() {
  return `'sha256-${createHash('sha256').update('').digest('base64')}'`;
}
