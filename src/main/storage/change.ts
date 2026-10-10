import type { ChangeEvent } from '../../shared/contracts/domain';
import type { StorageContext } from './context';
import type { StorageOperation } from './protocol';

export function storageChange(context: StorageContext, operation: StorageOperation): ChangeEvent {
  if (
    operation.includes('Asset') ||
    operation === 'storeDraftAttachment' ||
    operation === 'storeDraftAttachments'
  )
    return { revision: context.revision(), domains: ['attachments'] };
  if (operation === 'clearLibrary' || operation === 'commitLibraryImport')
    return {
      revision: context.revision(),
      cause: operation === 'clearLibrary' ? 'clear' : 'import',
      domains: ['snippets', 'tags', 'queue', 'attachments']
    };
  if (operation === 'saveQueueItemToLibrary')
    return { revision: context.revision(), domains: ['snippets', 'tags', 'attachments'] };
  if (operation.includes('Queue'))
    return { revision: context.revision(), domains: ['queue', 'attachments'] };
  if (operation === 'updateSettings')
    return { revision: context.revision(), domains: ['settings'] };
  if (
    [
      'createSnippet',
      'updateSnippet',
      'deleteSnippet',
      'undoDeleteSnippet',
      'duplicateSnippet'
    ].includes(operation)
  )
    return { revision: context.revision(), domains: ['snippets', 'tags', 'attachments'] };
  if (
    (operation === 'updateTag' || operation === 'deleteTag') &&
    context.db.prepare('SELECT id FROM queue_items LIMIT 1').get() !== undefined
  )
    return { revision: context.revision(), domains: ['tags', 'snippets', 'queue'] };
  const tagsOnly = operation === 'createTag' || operation === 'updateTag';
  const relationships = [
    'deleteSnippet',
    'undoDeleteSnippet',
    'duplicateSnippet',
    'setSnippetTags',
    'setTagMembership',
    'ensureTag',
    'deleteTag',
    'clearLibrary',
    'commitLibraryImport'
  ];

  return {
    revision: context.revision(),
    domains: tagsOnly
      ? ['tags', 'snippets']
      : relationships.includes(operation)
        ? ['snippets', 'tags']
        : ['snippets']
  };
}
