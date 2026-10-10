import { writeSync } from 'node:fs';

import type { SnippetWrites } from '../../snippets/snippet-writes';
import { StorageError } from '../context';
import { writeMarkdown } from './markdown-export';
import { writeWorkflowExport } from './workflow-export';

export function writeExport(
  descriptor: number,
  format: 'json' | 'markdown',
  writes: SnippetWrites
) {
  try {
    const write = (text: string, encoding: BufferEncoding = 'utf8') => {
      const bytes = Buffer.from(text, encoding);
      let offset = 0;

      while (offset < bytes.length) offset += writeSync(descriptor, bytes, offset);
    };

    if (format === 'json') {
      writeWorkflowExport(writes, write);
      return 0;
    } else {
      return writeMarkdown(writes, write);
    }
  } catch {
    throw new StorageError(
      'UNAVAILABLE',
      'Unable to write the export. Check the destination and disk space.'
    );
  }
}
