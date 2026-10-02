import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';
import type { SearchPage, SearchRequest } from '../../../shared/contracts/domain';
import type { DesktopResult } from '../../../shared/contracts/result';
import type { DesktopError } from '../../../shared/contracts/result';
import { createSearchClient } from '../../lib/desktop-client';
import { LibraryCursor } from './library-cursor';
import { initialLibraryState } from './library-state';
import { initialQuery, PAGE_SIZE, sameQuery } from './page-cache';

type LibraryBridge = Pick<DesktopBridge, 'searchSnippets' | 'subscribeChanges' | 'listTags'>;

/** Owns transient list state; IPC remains the authoritative query/write boundary. */
export class LibraryModel {
  private state = initialLibraryState();
  private listeners = new Set<() => void>();
  private client: ReturnType<typeof createSearchClient> | undefined;
  private cursor = new LibraryCursor();
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
    if (this.client !== undefined) return;
    this.closed = false;
    this.connect();
    this.cursor.invalidate(this.state);
    this.state.cache.clear();
    this.state.loading = true;
    this.publish();
    void this.refreshSummary();
    void this.fetch(0);
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
    this.cursor.reset();
    this.state.loading = true;
    this.state.error = undefined;
    this.publish();
    this.ensure(0);
  }

  private invalidate(): void {
    this.cursor.invalidate(this.state);
    this.state.cache.clear();
    this.state.loading = true;
    this.publish();
    void this.fetch(0);
  }

  ensure(index: number): void {
    if (this.closed || this.state.cache.at(index) !== undefined) return;
    if (this.cursor.desiredId !== null) return;
    void this.fetch(index);
  }

  private fetch(index: number): Promise<void> {
    const offset = Math.floor(Math.max(0, index) / PAGE_SIZE) * PAGE_SIZE;

    return this.client?.search({ ...this.state.request, offset }) ?? Promise.resolve();
  }

  select(id: string, index: number): boolean {
    const accepted = this.cursor.select(this.state, id, index);

    if (accepted) this.publish();
    return accepted;
  }

  refresh(): void {
    if (this.closed) return;
    this.invalidate();
    void this.refreshSummary();
  }

  moveSelection(delta: number): Promise<void> {
    if (this.state.total === 0) return Promise.resolve();
    const missing = this.cursor.move(this.state, delta);

    this.publish();
    return missing === undefined ? Promise.resolve() : this.fetch(missing);
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

    this.state.total = page.total;
    this.state.error = undefined;
    const next = this.cursor.settle(this.state, page, changed);

    if (next !== undefined) void this.fetch(next);
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
