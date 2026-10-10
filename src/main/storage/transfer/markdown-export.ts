import type { Attachment } from '../../../shared/contracts/attachments';
import { AssetRepository } from '../../attachments/repository';
import { QueueRepository } from '../../queue/repository';
import type { SnippetWrites } from '../../snippets/snippet-writes';
import { decodeSqlText } from '../sql-text';
import { portableSnippets } from './snapshot-stream';

function fenced(text: string): string {
  let longest = 3;

  for (const match of text.matchAll(/`+/gu)) longest = Math.max(longest, match[0].length);
  const fence = '`'.repeat(longest + 1);

  return `${fence}text\n${text}\n${fence}\n\n`;
}

function omissions(attachments: Attachment[]): string {
  return attachments.length === 0
    ? ''
    : `Attachments omitted (${String(attachments.length)}): ${JSON.stringify(attachments.map((attachment) => attachment.name))}\n\n`;
}

export function writeMarkdown(
  writes: SnippetWrites,
  write: (text: string, encoding: BufferEncoding) => void
): number {
  const context = writes.reader.context,
    queue = new QueueRepository(writes);
  let encoding: BufferEncoding = 'utf8',
    omitted = 0;

  for (const snippet of portableSnippets(context, true))
    if (/[\uD800-\uDFFF]/u.test(snippet.text)) encoding = 'utf16le';
  for (const { id } of queue.list().items)
    if (/[\uD800-\uDFFF]/u.test(queue.get(id).text)) encoding = 'utf16le';
  const emit = (text: string) => {
    write(text, encoding);
  };

  emit(`${encoding === 'utf16le' ? '\ufeff' : ''}# Promptly library (text only)\n\n`);
  let index = 0;

  for (const snippet of portableSnippets(context, true)) {
    const tags = context.db
      .prepare(
        'SELECT CAST(name AS BLOB) AS name FROM tags JOIN snippet_tags ON tags.id=tagId WHERE snippetId=? ORDER BY snippet_tags.rowid'
      )
      .all(snippet.id)
      .map((row) => decodeSqlText(row['name']));
    const attachments = new AssetRepository(context).list({ kind: 'snippet', id: snippet.id });

    omitted += attachments.length;
    emit(
      `## Snippet ${String(++index)}\n\nID: ${snippet.id}\nCreated: ${snippet.createdAt}\nUpdated: ${snippet.updatedAt}\nCopies: ${String(snippet.copyCount)}\nLast copied: ${snippet.lastCopiedAt ?? 'Never'}\nTags: ${JSON.stringify(tags)}\n\n${omissions(attachments)}${fenced(snippet.text)}`
    );
  }

  emit('# Queue (text only)\n\n');
  index = 0;
  for (const { id } of queue.list().items) {
    const item = queue.get(id);

    omitted += item.attachments.length;
    emit(
      `## Queued prompt ${String(++index)} (${item.completedAt === null ? 'Open' : 'Done'})\n\nID: ${item.id}\nCreated: ${item.createdAt}\nUpdated: ${item.updatedAt}\nCompleted: ${item.completedAt ?? 'Never'}\nTags: ${JSON.stringify(item.tags.map((tag) => tag.name))}\n\n${omissions(item.attachments)}${fenced(item.text)}`
    );
  }

  if (omitted > 0)
    emit(
      `## Attachments omitted (${String(omitted)})\n\nUse Backup (complete) to include attachment bytes and drawing scenes.\n`
    );
  return omitted;
}
