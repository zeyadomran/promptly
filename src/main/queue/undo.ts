import { queueItemSchema } from '../../shared/contracts/queue';
import { StorageError } from '../storage/context';
import type { QueueRepository } from './repository';

export function restoreQueue(queue: QueueRepository, token: string, kind: 'delete' | 'completion') {
  const row = queue.context.db
    .prepare('SELECT * FROM queue_undo WHERE token=? AND kind=? AND expires>?')
    .get(token, kind, queue.context.now().getTime());

  if (row === undefined) throw new StorageError('NOT_FOUND', 'Undo expired or unavailable.');
  const item = queueItemSchema.parse(JSON.parse(String(row['json'])));

  if (kind === 'delete') {
    const count = Number(
      queue.context.db.prepare('SELECT COUNT(*) AS count FROM queue_items').get()?.['count']
    );

    if (count >= 2000)
      throw new StorageError('UNAVAILABLE', 'Queue limit of 2,000 prompts reached.');
    queue.context.db
      .prepare('INSERT INTO queue_items VALUES(?,?,?,?,?,?,?,?,?)')
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

    order.splice(Math.min(item.position, order.length), 0, item.id);
    queue.reorder(order);
  }

  queue.context.db.prepare('DELETE FROM queue_undo WHERE token=?').run(token);
  queue.assets.releaseUndo(token);
  return queue.snapshot(item.id);
}
