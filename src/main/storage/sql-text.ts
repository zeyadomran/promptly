import { Buffer } from 'node:buffer';
import type { SQLOutputValue } from 'node:sqlite';

// Node 22's SQLite TEXT conversion truncates embedded NULs. Read string fields
// as BLOBs so the conversion retains every UTF-8 byte on all supported runtimes.
export function decodeSqlText(value: SQLOutputValue | undefined): string | null {
  if (value === null) return null;
  if (!(value instanceof Uint8Array)) throw new Error('Invalid stored text.');
  return Buffer.from(value).toString('utf8');
}

export const tagColumns = 'tags.id, CAST(tags.name AS BLOB) AS name, color, createdAt';

/** Preserve every UTF-16 code unit; legacy rows retain their existing UTF-8 fallback. */
export function decodeSnippetText(
  utf16: SQLOutputValue | undefined,
  utf8: SQLOutputValue | undefined
): string | null {
  return utf16 instanceof Uint8Array ? Buffer.from(utf16).toString('utf16le') : decodeSqlText(utf8);
}
