import { createHash } from 'node:crypto';
import { closeSync, fsyncSync, openSync, writeSync } from 'node:fs';

import { streamHeader } from '../../../shared/contracts/backup/stream';
import { type StorageContext, StorageError } from '../context';
import { decodeSqlText } from '../sql-text';
import { portableMemberships, portableSnippets, portableTags } from './snapshot-stream';

export function writeExport(
  context: StorageContext,
  filename: string,
  format: 'json' | 'markdown'
) {
  let descriptor: number | undefined;

  try {
    const output = openSync(filename, 'wx', 0o600);

    descriptor = output;
    const write = (text: string, encoding: BufferEncoding = 'utf8') => {
      const bytes = Buffer.from(text, encoding);
      let offset = 0;

      while (offset < bytes.length) offset += writeSync(output, bytes, offset);
    };

    if (format === 'json') {
      write(`${JSON.stringify(streamHeader)}\n`);
      const hash = createHash('sha256');
      const counts = { tags: 0, snippets: 0, memberships: 0 };
      const record = (type: string, value: unknown) => {
        const line = `${JSON.stringify({ type, value })}\n`;

        hash.update(line);
        write(line);
      };

      for (const value of portableTags(context)) {
        record('tag', value);
        counts.tags++;
      }

      for (const value of portableSnippets(context)) {
        record('snippet', value);
        counts.snippets++;
      }

      for (const value of portableMemberships(context)) {
        record('membership', value);
        counts.memberships++;
      }

      write(`${JSON.stringify({ type: 'end', ...counts, sha256: hash.digest('hex') })}\n`);
    } else {
      // Choose the encoding before writing; UTF-16 preserves unpaired code units.
      let encoding: BufferEncoding = 'utf8';

      for (const snippet of portableSnippets(context))
        if (/[\uD800-\uDFFF]/u.test(snippet.text)) {
          encoding = 'utf16le';
          break;
        }

      const emit = (text: string) => {
        write(text, encoding);
      };

      emit(`${encoding === 'utf16le' ? '\ufeff' : ''}# Promptly library\n\n`);
      let index = 0;

      for (const snippet of portableSnippets(context)) {
        let longest = 3;

        for (const match of snippet.text.matchAll(/`+/gu))
          longest = Math.max(longest, match[0].length);
        const fence = '`'.repeat(longest + 1);
        const tags = context.db
          .prepare(
            'SELECT CAST(name AS BLOB) AS name FROM tags JOIN snippet_tags ON tags.id = tagId WHERE snippetId = ? ORDER BY snippet_tags.rowid'
          )
          .all(snippet.id)
          .map((row) => decodeSqlText(row['name']));

        emit(
          `## Snippet ${String(++index)}\n\nID: ${snippet.id}\nCreated: ${snippet.createdAt}\nUpdated: ${snippet.updatedAt}\nCopies: ${String(snippet.copyCount)}\nLast copied: ${snippet.lastCopiedAt ?? 'Never'}\nTags: ${JSON.stringify(tags)}\n\n${fence}text\n${snippet.text}\n${fence}\n\n`
        );
      }
    }

    fsyncSync(descriptor);
  } catch {
    throw new StorageError(
      'UNAVAILABLE',
      'Unable to write the export. Check the destination and disk space.'
    );
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}
