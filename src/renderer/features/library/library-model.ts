import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';
import type { SearchPage, SearchRequest } from '../../../shared/contracts/domain';
import type { DesktopError, DesktopResult } from '../../../shared/contracts/result';
import { createSearchClient } from '../../lib/desktop-client';
import { handleLibraryChange } from './library-change';
import { LibraryCursor } from './library-cursor';
import { failLibraryDisplay, retainLibraryDisplay } from './library-display';
import { initialLibraryState, restartLibraryState } from './library-state';
import { applyLibrarySummary, readLibrarySummary } from './library-summary';
import { PAGE_SIZE, sameQuery } from './page-cache';

type LibraryBridge = Pick<DesktopBridge, 'searchSnippets' | 'subscribeChanges' | 'listTags'>;

/** Owns transient list state; IPC remains the authoritative query/write boundary. */
export class LibraryModel {
  private state = initialLibraryState();
  private listeners = new Set<() => void>();
  private client: ReturnType<typeof createSearchClient> | undefined;
  private cursor = new LibraryCursor();
  private summaryVersion = 0;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private closed = false;

  constructor(private bridge: LibraryBridge) {}

  private connect(): void {
    this.client = createSearchClient(
      this.bridge,
      (result, request) => {
        this.receive(result, request);
      },
      (event) =>
        handleLibraryChange(this.state, event, {
          publish: () => {
            this.publish();
          },
          refresh: () => {
            this.invalidate();
            void this.refreshSummary();
          }
        })
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
    restartLibraryState(this.state);
    this.publish();
    void this.refreshSummary();
    void this.fetch(0);
  }

  private async refreshSummary(): Promise<void> {
    const version = ++this.summaryVersion;
    const [total, tags] = await readLibrarySummary(this.bridge);

    if (this.closed || version !== this.summaryVersion) return;
    if (applyLibrarySummary(this.state, total, tags)) this.invalidate();
    this.publish();
  }

  /** Retire commands immediately; retain the display until the idle query settles. */
  query(request: SearchRequest, debounce = false): void {
    this.cancelSearchTimer();
    retainLibraryDisplay(this.state);
    this.state.request = { ...request, offset: 0, limit: PAGE_SIZE };
    this.state.selectedId = null;
    this.state.selectedIndex = -1;
    this.state.total = 0;
    this.cursor.reset();
    this.state.loading = true;
    this.state.error = undefined;
    if (debounce && request.query.length > 0) {
      this.searchTimer = setTimeout(() => {
        this.searchTimer = undefined;
        void this.fetch(0);
      }, 200);
    }

    this.publish();
    if (this.searchTimer === undefined) void this.fetch(0);
  }

  private cancelSearchTimer(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = undefined;
  }

  private invalidate(): void {
    retainLibraryDisplay(this.state);
    this.cursor.invalidate(this.state);
    this.state.loading = true;
    this.publish();
    void this.fetch(0);
  }

  ensure(index: number): void {
    if (
      this.closed ||
      this.state.retained !== undefined ||
      this.state.cache.at(index) !== undefined
    )
      return;
    if (this.cursor.desiredId !== null) return;
    void this.fetch(index);
  }

  private fetch(index: number): Promise<void> {
    if (this.closed || this.searchTimer !== undefined) return Promise.resolve();
    const offset = Math.floor(Math.max(0, index) / PAGE_SIZE) * PAGE_SIZE;

    return this.client?.search({ ...this.state.request, offset }) ?? Promise.resolve();
  }

  select(id: string, index: number): boolean {
    const accepted = this.cursor.select(this.state, id, index);

    if (accepted) {
      this.state.retained = undefined;
      this.publish();
    }

    return accepted;
  }

  refresh(): void {
    if (this.closed) return;
    this.invalidate();
    void this.refreshSummary();
  }

  moveSelection(delta: number): Promise<void> {
    if (this.state.retained !== undefined || this.state.total === 0) return Promise.resolve();
    this.state.revealVersion += 1;

    const missing = this.cursor.move(this.state, delta);

    this.publish();
    return missing === undefined ? Promise.resolve() : this.fetch(missing);
  }
  reveal(id: string): Promise<void> {
    if (this.closed) return Promise.resolve();
    this.cancelSearchTimer();
    this.cursor.reveal(this.state, id);
    this.publish();
    return this.fetch(0);
  }

  private receive(result: DesktopResult<SearchPage>, request: SearchRequest): void {
    if (this.closed || this.searchTimer !== undefined || !sameQuery(request, this.state.request))
      return;
    this.state.loading = false;
    if (!result.ok) {
      failLibraryDisplay(this.state, result.error);
      this.publish();
      return;
    }

    const page = result.value;
    const changed = this.state.cache.add(page);

    this.state.total = page.total;
    this.state.error = undefined;
    const next = this.cursor.settle(this.state, page, changed);

    if (next === undefined) this.state.retained = undefined;
    else this.state.loading = this.state.retained !== undefined;
    if (next !== undefined) void this.fetch(next);
    this.publish();
  }

  close(): void {
    this.closed = true;
    this.cancelSearchTimer();
    this.client?.dispose();
    this.client = undefined;
  }

  reportError(error: DesktopError): void {
    this.state.error = error;
    this.publish();
  }
}
