import type { AssetRepository } from '../attachments/repository';
import type { QueueRepository } from '../queue/repository';
import type { SnippetReader } from '../snippets/snippet-reader';
import { StorageError } from './context';
import type { StorageHandlers } from './protocol';

export function workflowHandlers(
  assets: AssetRepository,
  queue: QueueRepository,
  reader: SnippetReader
): Pick<
  StorageHandlers,
  | 'storeDraftAttachments'
  | 'beginAssetDraft'
  | 'discardAssetDraft'
  | 'getAssetDraft'
  | 'removeAssetDraft'
  | 'storeDraftAttachment'
  | 'readManagedAttachment'
  | 'listQueue'
  | 'getQueueItem'
  | 'createQueueItem'
  | 'updateQueueItem'
  | 'reorderQueueItems'
  | 'setQueueItemCompleted'
  | 'undoQueueCompletion'
  | 'deleteQueueItem'
  | 'undoDeleteQueueItem'
  | 'saveQueueItemToLibrary'
  | 'addSnippetToQueue'
  | 'recordQueueCopy'
> {
  return {
    storeDraftAttachments: ({ draftToken, files }) => {
      files.forEach((input) => assets.add(draftToken, input));
      return assets.draft(draftToken);
    },
    beginAssetDraft: ({ source }) => {
      if (source?.kind === 'snippet') reader.get(source.id);
      if (source?.kind === 'queue') queue.get(source.id);
      return assets.begin(source);
    },
    discardAssetDraft: ({ draftToken }) => {
      assets.discard(draftToken);
      return {};
    },
    getAssetDraft: ({ draftToken }) => assets.draft(draftToken),
    removeAssetDraft: ({ draftToken, id }) => assets.remove(draftToken, id),
    storeDraftAttachment: ({ draftToken, ...input }) => assets.add(draftToken, input),
    readManagedAttachment: ({ id, draftToken }) => {
      if (!assets.accessible(id, draftToken))
        throw new StorageError('NOT_FOUND', 'Attachment is unavailable.');
      return assets.read(id);
    },
    listQueue: () => queue.list(),
    getQueueItem: ({ id }) => queue.snapshot(id),
    createQueueItem: (input) => queue.create(input),
    updateQueueItem: (input) => queue.update(input),
    reorderQueueItems: ({ ids }) => queue.reorder(ids),
    setQueueItemCompleted: ({ id, completed }) => queue.complete(id, completed),
    undoQueueCompletion: ({ undoToken }) => queue.restore(undoToken, 'completion'),
    deleteQueueItem: ({ id }) => queue.delete(id),
    undoDeleteQueueItem: ({ undoToken }) => queue.restore(undoToken, 'delete'),
    saveQueueItemToLibrary: ({ id }) => queue.saveToLibrary(id),
    addSnippetToQueue: ({ id }) => queue.addSnippet(id),
    recordQueueCopy: ({ id }) => queue.recordCopy(id)
  };
}
