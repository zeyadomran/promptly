import { failure } from '../../shared/contracts/result';
import type { SavedCopySource } from '../../shared/contracts/workflow-copy';
import type { StorageClient } from '../storage/client';

/** The copy executor already owns the mutation turn; this adapter never queues another. */
export function storageCopyStatistics(storage: Pick<StorageClient, 'call'>) {
  return async (source: SavedCopySource) => {
    const result =
      source.kind === 'snippet'
        ? await storage.call('recordSuccessfulCopy', { id: source.id })
        : await storage.call('recordQueueCopy', { id: source.id });

    if (!result.ok) return result;
    const content = 'snippet' in result.value ? result.value.snippet : result.value.item;

    if (content.lastCopiedAt === null)
      return failure('UNAVAILABLE', 'Copy statistics were not confirmed.');
    return {
      ok: true as const,
      value: {
        revision: result.value.revision,
        copyCount: content.copyCount,
        lastCopiedAt: content.lastCopiedAt
      }
    };
  };
}
