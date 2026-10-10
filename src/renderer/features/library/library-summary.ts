import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';
import type { LibraryState } from './library-state';
import { initialQuery } from './page-cache';

export const readLibrarySummary = (bridge: Pick<DesktopBridge, 'searchSnippets' | 'listTags'>) =>
  Promise.all([bridge.searchSnippets({ ...initialQuery, limit: 1 }), bridge.listTags({})]);

/** Apply authoritative summary data; report when removed tags require a fresh query. */
export function applyLibrarySummary(
  state: LibraryState,
  total: Awaited<ReturnType<DesktopBridge['searchSnippets']>>,
  tags: Awaited<ReturnType<DesktopBridge['listTags']>>
): boolean {
  if (total.ok) state.unfilteredTotal = total.value.total;
  else state.error = total.error;
  if (!tags.ok) {
    state.error = tags.error;
    return false;
  }

  state.tags = tags.value.tags;
  const available = new Set(tags.value.tags.map((tag) => tag.id));
  const tagIds = state.request.tagIds.filter((id) => available.has(id));

  if (tagIds.length === state.request.tagIds.length) return false;
  state.request = { ...state.request, tagIds };
  return true;
}
