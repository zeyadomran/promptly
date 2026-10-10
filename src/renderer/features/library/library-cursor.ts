import type { SearchPage } from '../../../shared/contracts/domain';
import { retainLibraryDisplay } from './library-display';
import type { LibraryState } from './library-state';
import { PAGE_SIZE } from './page-cache';

/** Tracks intent separately from the currently validated, command-eligible row. */
export class LibraryCursor {
  desiredId: string | null = null;
  private index = 0;

  reset(): void {
    this.desiredId = null;
    this.index = 0;
  }
  reveal(state: LibraryState, id: string): void {
    retainLibraryDisplay(state);
    this.invalidate(state);
    this.desiredId = id;
    state.revealVersion += 1;
    state.loading = true;
  }

  invalidate(state: LibraryState): void {
    if (state.selectedId !== null) {
      this.desiredId = state.selectedId;
      this.index = state.selectedIndex;
    }

    this.retire(state);
  }

  private retire(state: LibraryState): void {
    state.selectedId = null;
    state.selectedIndex = -1;
  }

  select(state: LibraryState, id: string, index: number): boolean {
    if (state.cache.at(index)?.snippet.id !== id) return false;
    this.desiredId = null;
    this.index = index;
    state.selectedId = id;
    state.selectedIndex = index;
    return true;
  }

  move(state: LibraryState, delta: number): number | undefined {
    this.desiredId = null;
    this.index = Math.max(0, Math.min(state.total - 1, this.index + delta));
    const row = state.cache.at(this.index);

    if (row !== undefined) this.select(state, row.snippet.id, this.index);
    else this.retire(state);
    return row === undefined ? this.index : undefined;
  }

  settle(state: LibraryState, page: SearchPage, changed: boolean): number | undefined {
    if (changed) this.invalidate(state);
    // Eviction is a cache policy, not evidence that a validated selection disappeared.
    if (!changed && this.desiredId === null && state.selectedId !== null) return undefined;
    if (changed && this.desiredId !== null && page.offset !== 0) return 0;
    if (this.desiredId !== null) {
      const found = page.items.findIndex((item) => item.id === this.desiredId);

      if (found >= 0) {
        this.index = page.offset + found;
        this.desiredId = null;
      } else if (page.hasMore) return page.offset + PAGE_SIZE;
      else this.desiredId = null;
    }

    this.index = Math.max(0, Math.min(this.index, page.total - 1));
    const selected = state.cache.at(this.index);

    if (selected !== undefined) this.select(state, selected.snippet.id, this.index);
    else this.retire(state);
    return selected === undefined && page.total > 0 ? this.index : undefined;
  }
}
