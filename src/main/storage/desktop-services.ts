import type { DesktopOperations } from '../../shared/contracts/operations';
import type { StorageClient } from './client';
import { LibraryMutations } from './library-mutations';

export function storageDesktopServices(
  storage: StorageClient,
  mutations = new LibraryMutations(),
  onDeleted: (id: string) => void = () => undefined
): Partial<DesktopOperations> {
  return {
    searchSnippets: (input) => storage.call('searchSnippets', input),
    getSnippet: (input) => storage.call('getSnippet', input),
    createSnippet: (input) => mutations.run(() => storage.call('createSnippet', input)),
    updateSnippet: (input) => mutations.run(() => storage.call('updateSnippet', input)),
    duplicateSnippet: (input) => mutations.run(() => storage.call('duplicateSnippet', input)),
    deleteSnippet: (input) =>
      mutations.run(async () => {
        const result = await storage.call('deleteSnippet', input);

        if (result.ok) onDeleted(input.id);
        return result;
      }),
    undoDeleteSnippet: (input) => mutations.run(() => storage.call('undoDeleteSnippet', input)),
    setSnippetTags: (input) => mutations.run(() => storage.call('setSnippetTags', input)),
    listTags: () => storage.call('listTags', {}),
    createTag: (input) => mutations.run(() => storage.call('createTag', input)),
    ensureTag: (input) => mutations.run(() => storage.call('ensureTag', input)),
    setTagMembership: (input) => mutations.run(() => storage.call('setTagMembership', input)),
    updateTag: (input) => mutations.run(() => storage.call('updateTag', input)),
    deleteTag: (input) => mutations.run(() => storage.call('deleteTag', input))
  };
}
