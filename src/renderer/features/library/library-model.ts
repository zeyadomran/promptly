import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';
import type { SearchPage, SearchRequest } from '../../../shared/contracts/domain';
import type { DesktopResult } from '../../../shared/contracts/result';
import type { DesktopError } from '../../../shared/contracts/result';
import { createSearchClient } from '../../lib/desktop-client';
import { initialLibraryState } from './library-state';
import { initialQuery, PAGE_SIZE, sameQuery } from './page-cache';

type LibraryBridge = Pick<DesktopBridge, 'searchSnippets' | 'subscribeChanges' | 'listTags'>;

/** Owns transient list state; IPC remains the authoritative query/write boundary. */
export class LibraryModel {
  private state = initialLibraryState();
  private listeners = new Set<() => void>();
  private client: ReturnType<typeof createSearchClient> | undefined;
  private reconcileId: string | null = null;
  private targetIndex = 0;
  private summaryVersion = 0;
  private closed = false;

  constructor(private bridge: LibraryBridge) {}

  private connect(): void {
    this.client = createSearchClient(
      {
        searchSnippets: this.bridge.searchSnippets,
        subscribeChanges: (listener) =>
          this.bridge.subscribeChanges((event) => {
            if (event.domains.includes('snippets') || event.domains.includes('tags')) {
              this.invalidate();
              void this.refreshSummary();
            } else this.state.cache.promote(event.revision);
            listener(event);
          })
      },
      (result, request) => {
        this.receive(result, request);
      }
    );
  }

  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(): void {
    this.state = { ...this.state, version: this.state.version + 1 };
    for (const listener of this.listeners) listener();
  }

  start(): void {
    this.closed = false;
    this.connect();
    void this.refreshSummary();
    this.ensure(0);
  }

  private async refreshSummary(): Promise<void> {
    const version = ++this.summaryVersion;
    const [total, tags] = await Promise.all([
      this.bridge.searchSnippets({ ...initialQuery, limit: 1 }),
      this.bridge.listTags({})
    ]);

    if (this.closed || version !== this.summaryVersion) return;
    if (total.ok) this.state.unfilteredTotal = total.value.total;
    else this.state.error = total.error;
    if (tags.ok) this.state.tags = tags.value.tags;
    else this.state.error = tags.error;
    this.publish();
  }

  query(request: SearchRequest): void {
    this.state.request = { ...request, offset: 0, limit: PAGE_SIZE };
    this.state.cache.clear();
    this.state.selectedId = null;
    this.state.selectedIndex = -1;
    this.state.total = 0;
    this.reconcileId = null;
    this.targetIndex = 0;
    this.state.loading = true;
    this.state.error = undefined;
    this.publish();
    this.ensure(0);
  }

  private invalidate(): void {
    this.reconcileId = this.state.selectedId;
    this.targetIndex = Math.max(0, this.state.selectedIndex);
    this.state.selectedId = null;
    this.state.selectedIndex = -1;
    this.state.cache.clear();
    this.state.loading = true;
    this.publish();
    void this.fetch(0);
  }

  ensure(index: number): void {
    if (this.closed || this.state.cache.at(index) !== undefined) return;
    if (this.reconcileId !== null) return;
    void this.fetch(index);
  }

  private fetch(index: number): Promise<void> {
    const offset = Math.floor(Math.max(0, index) / PAGE_SIZE) * PAGE_SIZE;

    return this.client?.search({ ...this.state.request, offset }) ?? Promise.resolve();
  }

  select(id: string, index: number): void {
    if (this.state.cache.at(index)?.snippet.id !== id) return;
    this.reconcileId = null;
    this.targetIndex = index;
    this.state.selectedId = id;
    this.state.selectedIndex = index;
    this.publish();
  }

  moveSelection(delta: number): Promise<void> {
    if (this.state.total === 0) return Promise.resolve();
    this.reconcileId = null;
    this.targetIndex = Math.max(0, Math.min(this.state.total - 1, this.targetIndex + delta));
    const row = this.state.cache.at(this.targetIndex);

    if (row === undefined) return this.fetch(this.targetIndex);
    else this.select(row.snippet.id, this.targetIndex);
    return Promise.resolve();
  }

  private receive(result: DesktopResult<SearchPage>, request: SearchRequest): void {
    if (this.closed || !sameQuery(request, this.state.request)) return;
    this.state.loading = false;
    if (!result.ok) {
      this.state.error = result.error;
      this.state.selectedId = null;
      this.state.selectedIndex = -1;
      this.publish();
      return;
    }

    const page = result.value;
    const changed = this.state.cache.add(page);

    if (changed) {
      this.reconcileId = this.state.selectedId;
      this.state.selectedId = null;
      this.state.selectedIndex = -1;
    }

    this.state.total = page.total;
    this.state.error = undefined;
    if (changed && this.reconcileId !== null && page.offset !== 0) {
      void this.fetch(0);
      this.publish();
      return;
    }

    if (this.reconcileId !== null) {
      const found = page.items.findIndex((item) => item.id === this.reconcileId);

      if (found >= 0) {
        this.targetIndex = page.offset + found;
        this.reconcileId = null;
      } else if (page.hasMore) {
        void this.fetch(page.offset + PAGE_SIZE);
        this.publish();
        return;
      } else this.reconcileId = null;
    }

    this.targetIndex = Math.min(this.targetIndex, page.total - 1);
    const selected = this.state.cache.at(this.targetIndex);

    if (selected !== undefined) {
      this.state.selectedId = selected.snippet.id;
      this.state.selectedIndex = this.targetIndex;
    } else if (page.total === 0) {
      this.state.selectedId = null;
      this.state.selectedIndex = -1;
    } else this.ensure(this.targetIndex);
    this.publish();
  }

  close(): void {
    this.closed = true;
    this.client?.dispose();
    this.client = undefined;
  }

  reportError(error: DesktopError): void {
    this.state.error = error;
    this.publish();
  }
}
