import type { DesktopOperations } from '../../shared/contracts/operations';
import type { StorageClient } from './client';
import { LibraryMutations } from './library-mutations';

export function storageDesktopServices(
  storage: StorageClient,
  mutations = new LibraryMutations()
): Partial<DesktopOperations> {
  return {
    searchSnippets: (input) => storage.call('searchSnippets', input),
    getSnippet: (input) => storage.call('getSnippet', input),
    createSnippet: (input) => mutations.run(() => storage.call('createSnippet', input)),
    updateSnippet: (input) => mutations.run(() => storage.call('updateSnippet', input)),
    duplicateSnippet: (input) => mutations.run(() => storage.call('duplicateSnippet', input)),
    deleteSnippet: (input) => mutations.run(() => storage.call('deleteSnippet', input)),
    undoDeleteSnippet: (input) => mutations.run(() => storage.call('undoDeleteSnippet', input)),
    setSnippetTags: (input) => mutations.run(() => storage.call('setSnippetTags', input)),
    listTags: () => storage.call('listTags', {}),
    createTag: (input) => mutations.run(() => storage.call('createTag', input)),
    updateTag: (input) => mutations.run(() => storage.call('updateTag', input)),
    deleteTag: (input) => mutations.run(() => storage.call('deleteTag', input)),
    mergeTags: (input) => mutations.run(() => storage.call('mergeTags', input))
  };
}
