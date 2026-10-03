import type {
  SearchPage,
  SearchRequest,
  Snippet,
  SnippetPreview
} from '../../shared/contracts/domain';
import { previewLimits } from '../../shared/contracts/preview-limits';
import { matchRanges } from '../../shared/search/match-text';
import type { StorageContext } from '../storage/context';
import { rowPreview } from './row-preview';
import { compileSearchFilter } from './search-filter';
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
    if (this.snapshot.refresh()) this.sorted.clear();
    let entries = this.sorted.get(request.sort);

    if (entries === undefined) {
      entries = [...this.snapshot.entries.values()].sort((left, right) =>
        sorts[request.sort](left.snippet, right.snippet)
      );
      this.sorted.set(request.sort, entries);
    }

    const filter = compileSearchFilter(request);
    const items: SnippetPreview[] = [];
    let total = 0;

    for (const entry of entries) {
      if (!filter.matches(entry)) continue;
      if (total >= request.offset && items.length < request.limit)
        items.push({ ...entry.snippet, text: rowPreview(entry.snippet.text, request.preview) });
      total += 1;
    }

    const matches = Object.fromEntries(
      items.map((item) => [item.id, matchRanges(item.text, filter.text, previewLimits.highlights)])
    );

    return {
      revision: this.context.revision(),
      items,
      total,
      offset: request.offset,
      hasMore: request.offset + items.length < total,
      matches
    };
  }
}
