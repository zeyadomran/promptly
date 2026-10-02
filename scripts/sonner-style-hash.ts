import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

/** Permit only Sonner's exact emitted stylesheet, never arbitrary inline CSS. */
export function sonnerStyleHash() {
  const entry = createRequire(import.meta.url).resolve('sonner');
  const source = readFileSync(entry, 'utf8');
  const encoded = /__insertCSS\(("(?:\\.|[^"\\])*")\);/.exec(source)?.[1];

  if (encoded === undefined)
    throw new Error('Sonner CSS emission changed; review its CSP integration.');

  const css: unknown = JSON.parse(encoded);

  if (typeof css !== 'string') throw new Error('Sonner stylesheet must be a literal string.');

  return `'sha256-${createHash('sha256').update(css).digest('base64')}'`;
}

/** Sonner first appends an empty style element, then inserts its hashed CSS. */
export function emptyStyleHash() {
  return `'sha256-${createHash('sha256').update('').digest('base64')}'`;
}
