import type { SQLOutputValue } from 'node:sqlite';

import type { Snippet, Tag } from '../../shared/contracts/domain';
import { snippetSchema, tagSchema } from '../../shared/contracts/domain';
import { foldText } from '../../shared/search/match-text';
import type { StorageContext } from '../storage/context';
import { decodeSnippetText, decodeSqlText, tagColumns } from '../storage/sql-text';
import { installSearchChangeLog } from './change-log';

export interface SearchEntry {
  snippet: Snippet;
  text: string;
  sources: string[];
  tagNames: Set<string>;
  tagIds: Set<string>;
}

export const snippetColumns =
  'id, CAST(text AS BLOB) AS text, textUtf16, createdAt, updatedAt, CAST(sourceApp AS BLOB) AS sourceApp, sourceAppId, lastCopiedAt, copyCount';

export class SearchSnapshot {
  readonly entries = new Map<string, SearchEntry>();

  constructor(private readonly context: StorageContext) {
    installSearchChangeLog(context.db);
    this.reload();
  }

  refresh(): boolean {
    const dirty = this.context.db.prepare('SELECT id FROM search_dirty').all();

    if (dirty.length === 0) return false;
    if (dirty.length > 200) this.reload();
    else {
      const read = this.context.db.prepare(`SELECT ${snippetColumns} FROM snippets WHERE id = ?`);
      const tags = this.context.db.prepare(
        `SELECT ${tagColumns} FROM tags JOIN snippet_tags ON tagId = tags.id WHERE snippetId = ? ORDER BY tags.name, tags.id`
      );

      for (const item of dirty) {
        const id = String(item['id']);
        const row = read.get(id);

        if (row === undefined) this.entries.delete(id);
        else
          this.put(
            row,
            tags.all(id).map((tag) => this.tag(tag))
          );
      }
    }

    this.context.db.exec('DELETE FROM search_dirty');
    return true;
  }

  private tag(row: Record<string, SQLOutputValue>): Tag {
    return tagSchema.parse({
      id: row['id'],
      name: decodeSqlText(row['name']),
      color: row['color'],
      createdAt: row['createdAt']
    });
  }

  private reload(): void {
    const tags = new Map<string, Tag[]>();
    const relationships = this.context.db
      .prepare(
        `SELECT snippetId, ${tagColumns} FROM tags JOIN snippet_tags ON tagId = tags.id ORDER BY tags.name, tags.id`
      )
      .all();

    for (const row of relationships) {
      const id = String(row['snippetId']);
      const list = tags.get(id) ?? [];

      list.push(this.tag(row));
      tags.set(id, list);
    }

    this.entries.clear();
    for (const row of this.context.db.prepare(`SELECT ${snippetColumns} FROM snippets`).all())
      this.put(row, tags.get(String(row['id'])) ?? []);
  }

  private put(row: Record<string, SQLOutputValue>, tags: Tag[]): void {
    const { textUtf16: _bytes, ...record } = row;
    const snippet = snippetSchema.parse({
      ...record,
      text: decodeSnippetText(row['textUtf16'], row['text']),
      sourceApp: decodeSqlText(row['sourceApp']),
      tags
    });

    this.entries.set(snippet.id, {
      snippet,
      text: foldText(snippet.text),
      sources: [snippet.sourceApp, snippet.sourceAppId].flatMap((value) =>
        value === null ? [] : [foldText(value)]
      ),
      tagNames: new Set(tags.map((tag) => foldText(tag.name))),
      tagIds: new Set(tags.map((tag) => tag.id))
    });
  }
}
