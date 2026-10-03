import { SnippetSession } from '../snippets/snippet-session';
import type { delayedLibraryFixture } from './delayed-library-fixture';
import type { LibraryModel } from './library-model';

export function libraryPreviewFixture(
  fixture: ReturnType<typeof delayedLibraryFixture>,
  model: LibraryModel
) {
  const preview = new SnippetSession({
    getSnippet: ({ id }) => {
      const snippet = fixture.items().find((item) => item.id === id);

      return Promise.resolve(
        snippet === undefined
          ? { ok: false, error: { code: 'NOT_FOUND', message: 'Snippet no longer exists.' } }
          : { ok: true, value: { revision: 1, snippet } }
      );
    },
    updateSnippet: () => Promise.reject(new Error('Unused external operation'))
  });
  const unsubscribe = model.subscribe(() => {
    const { selectedId, loading, total } = model.snapshot();

    preview.select(selectedId, loading || total > 0);
  });

  return { preview, unsubscribe };
}
