import type { SQLInputValue } from 'node:sqlite';

import type { SearchPage, SearchRequest, Snippet } from '../../shared/contracts/domain';
import { snippetSchema, tagSchema } from '../../shared/contracts/domain';
import type { StorageContext } from '../storage/context';
import { StorageError } from '../storage/context';
import { decodeSqlText, tagColumns } from '../storage/sql-text';

const columns =
  'id, CAST(text AS BLOB) AS text, createdAt, updatedAt, CAST(sourceApp AS BLOB) AS sourceApp, sourceAppId, lastCopiedAt, copyCount';
const sortSql = {
  newest: 'updatedAt DESC, id ASC',
  oldest: 'createdAt ASC, id ASC',
  'most-copied': 'copyCount DESC, id ASC',
  'recently-copied': 'lastCopiedAt DESC NULLS LAST, id ASC'
};

export class SnippetReader {
  constructor(readonly context: StorageContext) {}

  get(id: string): Snippet {
    const row = this.context.db.prepare(`SELECT ${columns} FROM snippets WHERE id = ?`).get(id);

    if (row === undefined) throw new StorageError('NOT_FOUND', 'Snippet not found.');
    const tags = this.context.db
      .prepare(
        `SELECT ${tagColumns} FROM tags JOIN snippet_tags ON tagId = tags.id WHERE snippetId = ? ORDER BY tags.name, tags.id`
      )
      .all(id)
      .map((tag) => tagSchema.parse({ ...tag, name: decodeSqlText(tag['name']) }));

    return snippetSchema.parse({
      ...row,
      text: decodeSqlText(row['text']),
      sourceApp: decodeSqlText(row['sourceApp']),
      tags
    });
  }

  snapshot(id: string) {
    return { revision: this.context.revision(), snippet: this.get(id) };
  }

  query(request: SearchRequest): SearchPage {
    if (request.query !== '')
      throw new StorageError('UNAVAILABLE', 'Text search is not available yet.');
    const conditions: string[] = [];
    const parameters: SQLInputValue[] = [];

    for (const tagId of new Set(request.tagIds)) {
      conditions.push(
        'EXISTS (SELECT 1 FROM snippet_tags WHERE snippetId = snippets.id AND tagId = ?)'
      );
      parameters.push(tagId);
    }

    if (request.untagged)
      conditions.push('NOT EXISTS (SELECT 1 FROM snippet_tags WHERE snippetId = snippets.id)');
    const where = conditions.length === 0 ? '' : `WHERE ${conditions.join(' AND ')}`;
    const total = Number(
      this.context.db
        .prepare(`SELECT COUNT(*) AS total FROM snippets ${where}`)
        .get(...parameters)?.['total']
    );
    const ids = this.context.db
      .prepare(
        `SELECT id FROM snippets ${where} ORDER BY ${sortSql[request.sort]} LIMIT ? OFFSET ?`
      )
      .all(...parameters, request.limit, request.offset);
    const items = ids.map((row) => this.get(String(row['id'])));

    return {
      revision: this.context.revision(),
      items,
      total,
      offset: request.offset,
      hasMore: request.offset + items.length < total
    };
  }
}
