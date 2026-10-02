import type { DesktopOperations } from '../../shared/contracts/operations';
import type { StorageClient } from './client';

export function storageDesktopServices(storage: StorageClient): Partial<DesktopOperations> {
  return {
    searchSnippets: (input) => storage.call('searchSnippets', input),
    getSnippet: (input) => storage.call('getSnippet', input),
    createSnippet: (input) => storage.call('createSnippet', input),
    updateSnippet: (input) => storage.call('updateSnippet', input),
    duplicateSnippet: (input) => storage.call('duplicateSnippet', input),
    deleteSnippet: (input) => storage.call('deleteSnippet', input),
    undoDeleteSnippet: (input) => storage.call('undoDeleteSnippet', input),
    setSnippetTags: (input) => storage.call('setSnippetTags', input),
    listTags: () => storage.call('listTags', {}),
    createTag: (input) => storage.call('createTag', input),
    updateTag: (input) => storage.call('updateTag', input),
    deleteTag: (input) => storage.call('deleteTag', input),
    mergeTags: (input) => storage.call('mergeTags', input)
  };
}
