import type { LibraryModel } from '../library/library-model';

/** Clear only filters that hide this authoritative saved ID. */
export async function showLibraryEntry(model: LibraryModel, id: string) {
  const request = model.snapshot().request;
  const [text, tags] = await Promise.all([
    window.promptly.matchBundleSelection({
      ids: [id],
      query: request.query,
      tagIds: [],
      untagged: false
    }),
    window.promptly.matchBundleSelection({
      ids: [id],
      query: '',
      tagIds: request.tagIds,
      untagged: request.untagged
    })
  ]);

  if (!text.ok) throw new Error(text.error.message);
  if (!tags.ok) throw new Error(tags.error.message);
  if (model.snapshot().request !== request) return;
  const query = text.value.ids.includes(id) ? request.query : '';
  const hiddenTags = !tags.value.ids.includes(id);

  if (query !== request.query || hiddenTags)
    model.query({ ...request, query, ...(hiddenTags ? { tagIds: [], untagged: false } : {}) });
  await model.reveal(id);
}
