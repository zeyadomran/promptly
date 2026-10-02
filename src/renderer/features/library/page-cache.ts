import type { SearchPage, SearchRequest } from '../../../shared/contracts/domain';

export const PAGE_SIZE = 200;
export const MAX_CACHED_PAGES = 5;
export const initialQuery: SearchRequest = {
  query: '',
  tagIds: [],
  untagged: false,
  sort: 'newest',
  offset: 0,
  limit: PAGE_SIZE
};

export function sameQuery(left: SearchRequest, right: SearchRequest): boolean {
  return (
    left.query === right.query &&
    left.sort === right.sort &&
    left.untagged === right.untagged &&
    left.tagIds.join(',') === right.tagIds.join(',')
  );
}

/** Fixed-size LRU pages. Never combine different library snapshots. */
export class PageCache {
  private pages = new Map<number, SearchPage>();
  revision: number | undefined;

  clear(): void {
    this.pages.clear();
    this.revision = undefined;
  }

  promote(revision: number): void {
    // A contiguous settings-only commit proves the library did not change.
    if (this.revision !== undefined && revision === this.revision + 1) this.revision = revision;
  }

  add(page: SearchPage): boolean {
    const changed = this.revision !== undefined && this.revision !== page.revision;

    if (changed) this.clear();
    this.revision = page.revision;
    this.pages.delete(page.offset);
    this.pages.set(page.offset, page);
    if (this.pages.size > MAX_CACHED_PAGES) {
      const oldest = this.pages.keys().next().value;

      if (oldest !== undefined) this.pages.delete(oldest);
    }

    return changed;
  }

  at(index: number) {
    const offset = Math.floor(index / PAGE_SIZE) * PAGE_SIZE;
    const page = this.pages.get(offset);
    const snippet = page?.items[index - offset];

    if (page === undefined || snippet === undefined) return undefined;
    return { snippet, ranges: page.matches?.[snippet.id] ?? [] };
  }

  get size(): number {
    return this.pages.size;
  }

  indexOf(id: string): number | undefined {
    for (const [offset, page] of this.pages) {
      const found = page.items.findIndex((item) => item.id === id);

      if (found >= 0) return offset + found;
    }

    return undefined;
  }
}
