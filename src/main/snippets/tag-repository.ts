import { randomUUID } from 'node:crypto';

import { tagSchema, tagSummarySchema } from '../../shared/contracts/domain';
import { tagPresetColors } from '../../shared/contracts/tag-colors';
import { StorageError } from '../storage/context';
import type { StorageRequest } from '../storage/protocol';
import { decodeSqlText, tagColumns } from '../storage/sql-text';
import type { SnippetReader } from './snippet-reader';

export class TagRepository {
  constructor(readonly reader: SnippetReader) {}

  get(id: string) {
    const row = this.reader.context.db
      .prepare(`SELECT ${tagColumns} FROM tags WHERE id = ?`)
      .get(id);

    if (row === undefined) throw new StorageError('NOT_FOUND', 'Tag not found.');
    return tagSchema.parse({ ...row, name: decodeSqlText(row['name']) });
  }

  list() {
    const tags = this.reader.context.db
      .prepare(
        `SELECT ${tagColumns}, COUNT(snippetId) AS snippetCount FROM tags
        LEFT JOIN snippet_tags ON tagId = tags.id GROUP BY tags.id ORDER BY tags.name, tags.id`
      )
      .all()
      .map((row) => tagSummarySchema.parse({ ...row, name: decodeSqlText(row['name']) }));

    return { revision: this.reader.context.revision(), tags };
  }

  create(input: StorageRequest<'createTag'>) {
    const { context } = this.reader;
    const count = Number(context.db.prepare('SELECT COUNT(*) AS count FROM tags').get()?.['count']);
    const color = input.color ?? tagPresetColors[count % tagPresetColors.length];
    const id = randomUUID();

    context.db
      .prepare('INSERT INTO tags VALUES (?, ?, ?, ?)')
      .run(id, input.name, color ?? 'blue', context.now().toISOString());
    return { revision: context.revision(), tag: this.get(id) };
  }

  update(input: StorageRequest<'updateTag'>) {
    this.get(input.id);
    this.reader.context.db
      .prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?')
      .run(input.name, input.color, input.id);
    return { revision: this.reader.context.revision(), tag: this.get(input.id) };
  }

  ensure(input: StorageRequest<'ensureTag'>) {
    // Validate the captured target before creating anything; clear/delete cannot leave an orphan.
    if (input.snippetId !== undefined) this.reader.get(input.snippetId);
    const row = this.reader.context.db
      .prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE')
      .get(input.name);
    const tag = typeof row?.['id'] === 'string' ? this.get(row['id']) : this.create(input).tag;

    if (input.snippetId !== undefined)
      this.membership({ id: input.snippetId, tagId: tag.id, assigned: true });
    return { revision: this.reader.context.revision(), tag };
  }

  membership(input: StorageRequest<'setTagMembership'>) {
    const snippet = this.reader.get(input.id);
    const ids = snippet.tags.map((tag) => tag.id).filter((id) => id !== input.tagId);

    if (input.assigned) {
      if (snippet.tags.some((tag) => tag.id === input.tagId)) return this.reader.snapshot(input.id);
      ids.push(input.tagId);
    }

    if (ids.length > 100)
      throw new StorageError('INVALID_REQUEST', 'A snippet can have at most 100 tags.');
    return this.set({ id: input.id, tagIds: ids });
  }

  delete(input: StorageRequest<'deleteTag'>) {
    this.get(input.id);
    this.reader.context.db.prepare('DELETE FROM tags WHERE id = ?').run(input.id);
    return { revision: this.reader.context.revision() };
  }

  merge(input: StorageRequest<'mergeTags'>) {
    this.get(input.sourceId);
    this.get(input.targetId);
    this.reader.context.db
      .prepare(
        `INSERT OR IGNORE INTO snippet_tags (snippetId, tagId)
      SELECT snippetId, ? FROM snippet_tags WHERE tagId = ?`
      )
      .run(input.targetId, input.sourceId);
    return this.delete({ id: input.sourceId });
  }

  set(input: StorageRequest<'setSnippetTags'>) {
    this.reader.get(input.id);
    const ids = [...new Set(input.tagIds)];

    for (const id of ids) this.get(id);
    this.reader.context.db.prepare('DELETE FROM snippet_tags WHERE snippetId = ?').run(input.id);
    for (const id of ids)
      this.reader.context.db.prepare('INSERT INTO snippet_tags VALUES (?, ?)').run(input.id, id);
    this.reader.context.db
      .prepare('UPDATE snippets SET updatedAt = ? WHERE id = ?')
      .run(this.reader.context.now().toISOString(), input.id);
    return this.reader.snapshot(input.id);
  }
}
