import type { ChangeEvent } from '../../../shared/contracts/domain';
import type { LibraryState } from './library-state';

export function applyLibraryChange(state: LibraryState, event: ChangeEvent) {
  if (state.cache.retainCopy(event, state.request.sort)) return 'retained';
  if (event.domains.includes('snippets') || event.domains.includes('tags')) return 'relevant';
  state.cache.promote(event.revision);
  return 'unrelated';
}

export function handleLibraryChange(
  state: LibraryState,
  event: ChangeEvent,
  owner: {
    publish(): void;
    refresh(): void;
  }
): boolean {
  const change = applyLibraryChange(state, event);

  if (change === 'retained') owner.publish();
  if (change === 'relevant') owner.refresh();
  return change === 'relevant';
}
