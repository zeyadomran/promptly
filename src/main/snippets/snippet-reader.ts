import type { SearchPage, SearchRequest, Snippet } from '../../shared/contracts/domain';
import { snippetSchema, tagSchema } from '../../shared/contracts/domain';
import { SearchLibrary } from '../search/search-library';
import type { StorageContext } from '../storage/context';
import { StorageError } from '../storage/context';
import { decodeSqlText, tagColumns } from '../storage/sql-text';

const columns =
  'id, CAST(text AS BLOB) AS text, createdAt, updatedAt, CAST(sourceApp AS BLOB) AS sourceApp, sourceAppId, lastCopiedAt, copyCount';

export class SnippetReader {
  private readonly search: SearchLibrary;

  constructor(readonly context: StorageContext) {
    this.search = new SearchLibrary(context);
  }

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
    return this.search.query(request);
  }
}
