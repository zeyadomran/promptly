import type { BundleSelectionRequest } from '../../shared/contracts/bundle-selection';
import type { SearchPage, SearchRequest, Snippet } from '../../shared/contracts/domain';
import { snippetSchema, tagSchema } from '../../shared/contracts/domain';
import { SearchLibrary } from '../search/search-library';
import type { StorageContext } from '../storage/context';
import { StorageError } from '../storage/context';
import { decodeSnippetText, decodeSqlText, snippetColumns, tagColumns } from '../storage/sql-text';

export class SnippetReader {
  private readonly search: SearchLibrary;

  constructor(readonly context: StorageContext) {
    this.search = new SearchLibrary(context);
  }

  get(id: string): Snippet {
    const row = this.context.db
      .prepare(`SELECT ${snippetColumns} FROM snippets WHERE id = ?`)
      .get(id);

    if (row === undefined) throw new StorageError('NOT_FOUND', 'Snippet not found.');
    const tags = this.context.db
      .prepare(
        `SELECT ${tagColumns} FROM tags JOIN snippet_tags ON tagId = tags.id WHERE snippetId = ? ORDER BY snippet_tags.rowid`
      )
      .all(id)
      .map((tag) => tagSchema.parse({ ...tag, name: decodeSqlText(tag['name']) }));

    const { textUtf16: _bytes, ...record } = row;

    return snippetSchema.parse({
      ...record,
      text: decodeSnippetText(row['textUtf16'], row['text']),
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

  matchSelected(request: BundleSelectionRequest) {
    return this.search.matchSelected(request);
  }
}
