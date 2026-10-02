import type { SearchPage, SearchRequest, Snippet } from '../../shared/contracts/domain';
import { foldText, matchRanges } from '../../shared/search/match-text';
import { parseQuery } from '../../shared/search/parse-query';
import type { StorageContext } from '../storage/context';
import type { SearchEntry } from './search-snapshot';
import { SearchSnapshot } from './search-snapshot';

const compareId = (left: Snippet, right: Snippet) =>
  left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
const mostCopied = (left: Snippet, right: Snippet) =>
  right.copyCount - left.copyCount || compareId(left, right);
const recentlyCopied = (left: Snippet, right: Snippet) =>
  compareText(right.lastCopiedAt ?? '', left.lastCopiedAt ?? '') || compareId(left, right);
const sorts: Record<SearchRequest['sort'], (left: Snippet, right: Snippet) => number> = {
  newest: (left, right) => compareText(right.updatedAt, left.updatedAt) || compareId(left, right),
  oldest: (left, right) => compareText(left.createdAt, right.createdAt) || compareId(left, right),
  'most-copied': mostCopied,
  'recently-copied': recentlyCopied
};

/** Worker-owned folded snapshot; substring scans also handle 1/2 chars and literal NUL. */
export class SearchLibrary {
  private readonly snapshot: SearchSnapshot;
  private readonly sorted = new Map<SearchRequest['sort'], SearchEntry[]>();

  constructor(private readonly context: StorageContext) {
    this.snapshot = new SearchSnapshot(context);
  }

  query(request: SearchRequest): SearchPage {
    const started = performance.now();

    if (this.snapshot.refresh()) this.sorted.clear();
    let entries = this.sorted.get(request.sort);

    if (entries === undefined) {
      entries = [...this.snapshot.entries.values()].sort((left, right) =>
        sorts[request.sort](left.snippet, right.snippet)
      );
      this.sorted.set(request.sort, entries);
    }

    const parsed = parseQuery(request.query);
    const text = parsed.text.map(foldText);
    const tags = parsed.tags.map(foldText);
    const sources = parsed.sources.map(foldText);
    const items: Snippet[] = [];
    let total = 0;

    for (const entry of entries) {
      if (
        (request.untagged && entry.tagIds.size !== 0) ||
        !request.tagIds.every((id) => entry.tagIds.has(id)) ||
        !tags.every((name) => entry.tagNames.has(name)) ||
        !sources.every((source) => entry.sources.some((value) => value.includes(source))) ||
        !text.every((term) => entry.text.includes(term))
      )
        continue;
      if (total >= request.offset && items.length < request.limit) items.push(entry.snippet);
      total += 1;
    }

    const matches = Object.fromEntries(
      items.map((item) => [item.id, matchRanges(item.text, text)])
    );

    return {
      revision: this.context.revision(),
      items,
      total,
      offset: request.offset,
      hasMore: request.offset + items.length < total,
      matches,
      searchDurationMs: performance.now() - started
    };
  }
}
