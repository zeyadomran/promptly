import assert from 'node:assert/strict';

import type { SearchRequest } from '../../shared/contracts/domain';
import type { StorageOperation, StorageRequest, StorageResponse } from '../storage/protocol';

type SearchCall = <K extends StorageOperation>(
  operation: K,
  input: StorageRequest<K>
) => Promise<StorageResponse<K>>;

export async function searchPreviewFlow(call: SearchCall, id: string, request: SearchRequest) {
  const whitespace = ' '.repeat(1_023) + '😀needle';

  await call('updateSnippet', { id: id, text: whitespace });
  const boundary = await call('searchSnippets', { ...request, query: 'needle', tagIds: [] });

  assert.equal(boundary.total, 1);
  assert.equal(boundary.items[0]?.id, id);
  assert.equal(boundary.items[0].text, ' '.repeat(1_023));
  assert.equal(boundary.items[0].hasText, true);
  assert.equal((await call('getSnippet', { id })).snippet.text, whitespace);
  await call('updateSnippet', { id: id, text: 'İ😀𐐀 gap needle' });
  const unicode = await call('searchSnippets', { ...request, query: 'i 😀 𐐨 needle', tagIds: [] });

  assert.deepEqual(unicode.matches?.[id], [
    { start: 0, end: 5 },
    { start: 10, end: 16 }
  ]);
}
