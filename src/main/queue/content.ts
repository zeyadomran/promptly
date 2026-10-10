import { StorageError } from '../storage/context';
import type { StorageRequest } from '../storage/protocol';
import type { QueueRepository } from './repository';

export function writeQueueContent(
  queue: QueueRepository,
  id: string,
  input: StorageRequest<'createQueueItem'>
): void {
  if (input.tagIds !== undefined) {
    queue.context.db.prepare('DELETE FROM queue_tags WHERE itemId=?').run(id);
    [...new Set(input.tagIds)].forEach((tag) =>
      queue.context.db.prepare('INSERT INTO queue_tags VALUES(?,?)').run(id, tag)
    );
  }

  if (input.draftToken !== undefined) {
    queue.assets.replace({ kind: 'queue', id }, queue.assets.draft(input.draftToken).attachments);
    queue.assets.discard(input.draftToken);
  }

  if (input.text.trim() === '' && queue.assets.list({ kind: 'queue', id }).length === 0)
    throw new StorageError('INVALID_REQUEST', 'Add text or an attachment before saving.');
}
