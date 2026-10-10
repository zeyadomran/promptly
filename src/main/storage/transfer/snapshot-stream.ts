import {
  membershipSchema,
  portableSnippetSchema,
  portableTagSchema
} from '../../../shared/contracts/backup/format';
import { workflowSnippetSchema } from '../../../shared/contracts/backup/workflow';
import type { StorageContext } from '../context';
import { decodeSnippetText, decodeSqlText, tagColumns } from '../sql-text';

/** Iterators bound memory to one record within a coherent synchronous worker turn. */
export function* portableSnippets(context: StorageContext, workflow = false) {
  for (const row of context.db
    .prepare(
      'SELECT id, CAST(text AS BLOB) AS text, textUtf16, createdAt, updatedAt, lastCopiedAt, copyCount FROM snippets ORDER BY id'
    )
    .iterate()) {
    const { textUtf16, ...value } = row;

    yield (workflow ? workflowSnippetSchema : portableSnippetSchema).parse({
      ...value,
      text: decodeSnippetText(textUtf16, row['text'])
    });
  }
}

export function* portableTags(context: StorageContext) {
  for (const row of context.db.prepare(`SELECT ${tagColumns} FROM tags ORDER BY tags.id`).iterate())
    yield portableTagSchema.parse({ ...row, name: decodeSqlText(row['name']) });
}

export function* portableMemberships(context: StorageContext) {
  for (const row of context.db
    .prepare('SELECT snippetId, tagId FROM snippet_tags ORDER BY snippetId, rowid')
    .iterate())
    yield membershipSchema.parse(row);
}
