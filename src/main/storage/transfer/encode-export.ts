import { backupLimits, type PortableBackup } from '../../../shared/contracts/backup/format';
import { StorageError } from '../context';

export function encodeExport(
  backup: PortableBackup,
  format: 'json' | 'markdown'
): Uint8Array<ArrayBuffer> {
  const text = format === 'json' ? JSON.stringify(backup, null, 2) : markdown(backup);
  // JSON escapes lone surrogates. Markdown uses a BOM-marked UTF-16 fallback only
  // when UTF-8 cannot represent an original code unit without replacement.
  const data =
    format === 'markdown' && /[\uD800-\uDFFF]/u.test(text)
      ? Buffer.from(`\ufeff${text}`, 'utf16le')
      : Buffer.from(text, 'utf8');

  if (data.byteLength > backupLimits.bytes)
    throw new StorageError('UNAVAILABLE', 'Export exceeds the 64 MiB portable limit.');
  return Uint8Array.from(data);
}

function markdown(backup: PortableBackup): string {
  const names = new Map(backup.tags.map((tag) => [tag.id, tag.name]));
  const tags = new Map<string, string[]>();

  for (const association of backup.memberships) {
    const list = tags.get(association.snippetId) ?? [];

    list.push(names.get(association.tagId) ?? '');
    tags.set(association.snippetId, list);
  }

  return [
    '# Promptly library',
    '',
    ...backup.snippets.flatMap((snippet, index) => {
      let longest = 3;

      for (const match of snippet.text.matchAll(/`+/gu))
        longest = Math.max(longest, match[0].length);
      const fence = '`'.repeat(longest + 1);

      return [
        `## Snippet ${String(index + 1)}`,
        '',
        `ID: ${snippet.id}`,
        `Created: ${snippet.createdAt}`,
        `Updated: ${snippet.updatedAt}`,
        `Copies: ${String(snippet.copyCount)}`,
        `Last copied: ${snippet.lastCopiedAt ?? 'Never'}`,
        `Tags: ${JSON.stringify(tags.get(snippet.id) ?? [])}`,
        '',
        `${fence}text`,
        snippet.text,
        fence,
        ''
      ];
    })
  ].join('\n');
}
