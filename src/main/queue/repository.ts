import { randomUUID } from 'node:crypto';

import { tagSchema } from '../../shared/contracts/domain';
import { type QueueItem, queueItemSchema } from '../../shared/contracts/queue';
import { AssetRepository } from '../attachments/repository';
import { rowPreview } from '../search/row-preview';
import type { SnippetWrites } from '../snippets/snippet-writes';
import { StorageError } from '../storage/context';
import type { StorageRequest } from '../storage/protocol';
import { decodeSnippetText, decodeSqlText, tagColumns } from '../storage/sql-text';
import { writeQueueContent } from './content';
import { restoreQueue } from './undo';

export class QueueRepository {
  readonly assets: AssetRepository;
  constructor(readonly writes: SnippetWrites) {
    this.assets = new AssetRepository(writes.reader.context);
  }
  get context() {
    return this.writes.reader.context;
  }
  get(id: string): QueueItem {
    return this.read(id);
  }
  private read(id: string, preview = false): QueueItem {
    const row = this.context.db
      .prepare(
        preview
          ? 'SELECT id,substr(textUtf16,1,2050) AS textUtf16,CAST(substr(text,1,1025) AS BLOB) AS text,createdAt,updatedAt,completedAt,position,copyCount,lastCopiedAt FROM queue_items WHERE id=?'
          : 'SELECT *,CAST(text AS BLOB) AS text FROM queue_items WHERE id=?'
      )
      .get(id);

    if (row === undefined) throw new StorageError('NOT_FOUND', 'Queued prompt not found.');
    const tags = this.context.db
      .prepare(
        `SELECT ${tagColumns} FROM tags JOIN queue_tags ON tagId=tags.id WHERE itemId=? ORDER BY queue_tags.rowid`
      )
      .all(id)
      .map((tag) => tagSchema.parse({ ...tag, name: decodeSqlText(tag['name']) }));
    const { textUtf16, hasText: _hasText, ...record } = row;

    return queueItemSchema.parse({
      ...record,
      text: decodeSnippetText(textUtf16, row['text']),
      tags,
      attachments: this.assets.list({ kind: 'queue', id })
    });
  }
  snapshot(id: string) {
    return { revision: this.context.revision(), item: this.get(id) };
  }
  list() {
    const items = this.context.db
      .prepare(
        'SELECT id,hasText FROM queue_items ORDER BY completedAt IS NOT NULL,CASE WHEN completedAt IS NULL THEN position END,completedAt DESC,id'
      )
      .all()
      .map((row) => {
        const item = this.read(String(row['id']), true);

        return { ...item, text: rowPreview(item.text, 'row'), hasText: row['hasText'] === 1 };
      });

    return {
      revision: this.context.revision(),
      items,
      openCount: items.filter((item) => item.completedAt === null).length
    };
  }
  create(input: StorageRequest<'createQueueItem'>) {
    if (
      Number(
        this.context.db.prepare('SELECT COUNT(*) AS count FROM queue_items').get()?.['count']
      ) >= 2000
    )
      throw new StorageError('UNAVAILABLE', 'Queue limit of 2,000 prompts reached.');
    const id = randomUUID(),
      now = this.context.now().toISOString();
    const position = Number(
      this.context.db
        .prepare('SELECT COUNT(*) AS count FROM queue_items WHERE completedAt IS NULL')
        .get()?.['count']
    );

    this.context.db
      .prepare(
        'INSERT INTO queue_items(id,text,textUtf16,createdAt,updatedAt,completedAt,position,copyCount,lastCopiedAt) VALUES(?,?,?,?,?,?,?,?,?)'
      )
      .run(id, input.text, Buffer.from(input.text, 'utf16le'), now, now, null, position, 0, null);
    writeQueueContent(this, id, input);
    return this.snapshot(id);
  }
  update(input: StorageRequest<'updateQueueItem'>) {
    this.get(input.id);
    this.context.db
      .prepare('UPDATE queue_items SET text=?,textUtf16=?,updatedAt=? WHERE id=?')
      .run(
        input.text,
        Buffer.from(input.text, 'utf16le'),
        this.context.now().toISOString(),
        input.id
      );
    writeQueueContent(this, input.id, input);
    return this.snapshot(input.id);
  }
  reorder(ids: string[]) {
    const current = this.list()
      .items.filter((item) => item.completedAt === null)
      .map((item) => item.id);

    if (
      new Set(ids).size !== ids.length ||
      ids.length !== current.length ||
      current.some((id) => !ids.includes(id))
    )
      throw new StorageError('CONFLICT', 'Review the current queue before reordering.');
    ids.forEach((id, position) =>
      this.context.db.prepare('UPDATE queue_items SET position=? WHERE id=?').run(position, id)
    );
    return { revision: this.context.revision() };
  }
  complete(id: string, completed: boolean) {
    const item = this.get(id),
      undoToken = this.undo(item, 'completion');

    this.context.db
      .prepare('UPDATE queue_items SET completedAt=?,position=? WHERE id=?')
      .run(
        completed ? this.context.now().toISOString() : null,
        completed ? item.position : this.list().openCount,
        id
      );
    this.normalize();
    return { ...this.snapshot(id), undoToken };
  }
  delete(id: string) {
    const item = this.get(id),
      undoToken = this.undo(item, 'delete');

    this.assets.retainUndo(undoToken, item.attachments);
    this.assets.replace({ kind: 'queue', id }, []);
    this.context.db.prepare('DELETE FROM queue_items WHERE id=?').run(id);
    this.normalize();
    return { revision: this.context.revision(), undoToken };
  }
  private undo(item: QueueItem, kind: string) {
    const token = randomUUID();

    this.context.db
      .prepare('INSERT INTO queue_undo VALUES(?,?,?,?)')
      .run(token, kind, JSON.stringify(item), this.context.now().getTime() + 30_000);
    return token;
  }
  restore(token: string, kind: 'delete' | 'completion') {
    return restoreQueue(this, token, kind);
  }
  private normalize() {
    this.list()
      .items.filter((item) => item.completedAt === null)
      .forEach((item, position) =>
        this.context.db
          .prepare('UPDATE queue_items SET position=? WHERE id=?')
          .run(position, item.id)
      );
  }
  saveToLibrary(id: string) {
    const item = this.get(id),
      draft = this.assets.begin({ kind: 'queue', id });

    return this.writes.create({
      text: item.text,
      tagIds: item.tags.map((tag) => tag.id),
      draftToken: draft.token
    });
  }
  addSnippet(id: string) {
    const snippet = this.writes.reader.get(id),
      draft = this.assets.begin({ kind: 'snippet', id });

    return this.create({
      text: snippet.text,
      tagIds: snippet.tags.map((tag) => tag.id),
      draftToken: draft.token
    });
  }
  recordCopy(id: string) {
    this.get(id);
    this.context.db
      .prepare('UPDATE queue_items SET copyCount=copyCount+1,lastCopiedAt=? WHERE id=?')
      .run(this.context.now().toISOString(), id);
    return this.snapshot(id);
  }
}
