import type { DesktopError } from '../../../shared/contracts/result';
import type { LibraryState } from './library-state';
import { PageCache } from './page-cache';

export type LibraryDisplay = Pick<
  LibraryState,
  'cache' | 'total' | 'selectedId' | 'selectedIndex' | 'request'
>;

/** The rendered snapshot may outlive command eligibility while a replacement is pending. */
export function libraryDisplay(state: LibraryState): LibraryDisplay {
  return state.retained ?? state;
}

export function retainLibraryDisplay(state: LibraryState): void {
  if (state.retained === undefined && state.total > 0 && state.cache.size > 0) {
    const { cache, total, selectedId, selectedIndex, request } = state;

    state.retained = { cache, total, selectedId, selectedIndex, request };
  }

  state.cache = new PageCache();
}

export function failLibraryDisplay(state: LibraryState, error: DesktopError): void {
  if (state.retained !== undefined) {
    state.cache.clear();
    state.total = 0;
    state.retained = undefined;
  }

  state.error = error;
  state.selectedId = null;
  state.selectedIndex = -1;
}
