import { randomUUID } from 'node:crypto';

import { assetIdSchema } from '../../shared/contracts/attachments';
import { type QueueItem, queueItemSchema } from '../../shared/contracts/queue';
import { StorageError } from '../storage/context';
import type { QueueRepository } from './repository';

const undoItemSchema = queueItemSchema.extend({ nextId: assetIdSchema.nullable().optional() });

export function rememberQueueUndo(
  queue: QueueRepository,
  item: QueueItem,
  kind: 'delete' | 'completion'
) {
  const token = randomUUID();
  const nextId =
    kind === 'completion' && item.completedAt === null
      ? (queue.context.db
          .prepare(
            'SELECT id FROM queue_items WHERE completedAt IS NULL AND position>? ORDER BY position,id LIMIT 1'
          )
          .get(item.position)?.['id'] ?? null)
      : undefined;

  queue.context.db
    .prepare('INSERT INTO queue_undo VALUES(?,?,?,?)')
    .run(
      token,
      kind,
      JSON.stringify({ ...item, ...(nextId === undefined ? {} : { nextId }) }),
      queue.context.now().getTime() + 30_000
    );
  return token;
}

export function restoreQueue(queue: QueueRepository, token: string, kind: 'delete' | 'completion') {
  const row = queue.context.db
    .prepare('SELECT * FROM queue_undo WHERE token=? AND kind=? AND expires>?')
    .get(token, kind, queue.context.now().getTime());

  if (row === undefined) throw new StorageError('NOT_FOUND', 'Undo expired or unavailable.');
  const { nextId, ...item } = undoItemSchema.parse(JSON.parse(String(row['json'])));

  if (kind === 'delete') {
    const count = Number(
      queue.context.db.prepare('SELECT COUNT(*) AS count FROM queue_items').get()?.['count']
    );

    if (count >= 2000)
      throw new StorageError('UNAVAILABLE', 'Queue limit of 2,000 prompts reached.');
    queue.context.db
      .prepare(
        'INSERT INTO queue_items(id,text,textUtf16,createdAt,updatedAt,completedAt,position,copyCount,lastCopiedAt) VALUES(?,?,?,?,?,?,?,?,?)'
      )
      .run(
        item.id,
        item.text,
        Buffer.from(item.text, 'utf16le'),
        item.createdAt,
        item.updatedAt,
        item.completedAt,
        item.position,
        item.copyCount,
        item.lastCopiedAt
      );
    item.tags
      .filter(
        (tag) =>
          queue.context.db.prepare('SELECT id FROM tags WHERE id=?').get(tag.id) !== undefined
      )
      .forEach((tag) =>
        queue.context.db.prepare('INSERT INTO queue_tags VALUES(?,?)').run(item.id, tag.id)
      );
    queue.assets.replace({ kind: 'queue', id: item.id }, item.attachments);
  } else {
    queue.get(item.id);
    queue.context.db
      .prepare('UPDATE queue_items SET completedAt=?,position=? WHERE id=?')
      .run(item.completedAt, item.position, item.id);
  }

  if (item.completedAt === null) {
    const order = queue
      .list()
      .items.filter((candidate) => candidate.completedAt === null && candidate.id !== item.id)
      .map((candidate) => candidate.id);

    const anchor = nextId === undefined || nextId === null ? -1 : order.indexOf(nextId);
    const position =
      kind === 'completion'
        ? anchor < 0
          ? order.length
          : anchor
        : Math.min(item.position, order.length);

    order.splice(position, 0, item.id);
    queue.reorder(order);
  }

  queue.context.db.prepare('DELETE FROM queue_undo WHERE token=?').run(token);
  queue.assets.releaseUndo(token);
  return queue.snapshot(item.id);
}
