import type { DesktopBridge } from '../../../shared/contracts/desktop-bridge';
import type { SnippetSessionState } from './snippet-session-state';

/** Keeps one edit draft independently of transient query/selection lifetimes. */
export class SnippetSession {
  private state: SnippetSessionState = {
    snippet: null,
    draft: '',
    editing: false,
    loading: false,
    pending: false,
    prompt: false,
    missing: false,
    conflict: false,
    error: undefined
  };
  private selectedId: string | null = null;
  private generation = 0;
  private refreshVersion = 0;
  private closed = false;
  private listeners = new Set<() => void>();
  constructor(private bridge: Pick<DesktopBridge, 'getSnippet' | 'updateSnippet'>) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(update: Partial<SnippetSessionState>): void {
    if (this.closed) return;
    this.state = { ...this.state, ...update };
    for (const listener of this.listeners) listener();
  }
  get dirty(): boolean {
    return this.state.editing && this.state.draft !== this.state.snippet?.text;
  }
  start(): void {
    this.closed = false;
    if (!this.state.editing) void this.load(this.selectedId);
  }
  select(id: string | null, pending = false): void {
    // Retiring command eligibility while resolving a page is not new selection intent.
    if (id === null && pending) return;
    if (this.closed || id === this.selectedId) return;
    this.selectedId = id;
    if (this.dirty || this.state.pending) {
      this.publish({ prompt: id !== this.state.snippet?.id });
      return;
    }

    void this.load(id);
  }
  edit(): void {
    if (this.state.snippet === null || this.state.loading) return;
    this.refreshVersion += 1;
    this.publish({ editing: true, draft: this.state.snippet.text, error: undefined });
  }
  change(draft: string): void {
    if (this.state.editing && !this.state.pending) this.publish({ draft });
  }
  warnModeChange(): void {
    if (this.dirty) this.publish({ prompt: true });
  }
  keep(): void {
    this.publish({ prompt: false });
  }
  discard(): void {
    if (this.state.pending) return;
    this.publish({ editing: false, prompt: false });
    void this.load(this.selectedId);
  }
  report(error: string): void {
    this.publish({ error });
  }
  async save(): Promise<boolean> {
    const snippet = this.state.snippet;
    const text = this.state.draft;

    if (snippet === null || this.state.loading || this.state.pending || this.state.missing)
      return false;
    if (text.trim() === '') {
      this.report('A snippet cannot be empty.');
      return false;
    }

    const generation = ++this.generation;

    this.publish({ pending: true, error: undefined });
    try {
      const result = await this.bridge.updateSnippet({ id: snippet.id, text });

      if (this.closed || generation !== this.generation) return false;
      if (!result.ok) {
        this.publish({ pending: false, error: result.error.message });
        return false;
      }

      this.refreshVersion += 1;
      this.publish({
        snippet: result.value.snippet,
        draft: text,
        editing: false,
        pending: false,
        prompt: false,
        conflict: false
      });
      if (this.selectedId !== snippet.id) await this.load(this.selectedId);
      return true;
    } catch {
      if (generation !== this.generation) return false;
      this.publish({
        pending: false,
        error: 'The edit could not be confirmed. Your draft is kept.'
      });
      return false;
    }
  }
  refresh(): void {
    if (this.closed) return;
    if (!this.dirty && !this.state.pending) {
      void this.load(this.selectedId);
      return;
    }

    const snippet = this.state.snippet;

    if (snippet === null) return;
    const generation = this.generation;
    const refresh = ++this.refreshVersion;

    void this.bridge
      .getSnippet({ id: snippet.id })
      .then((result) => {
        if (
          this.closed ||
          generation !== this.generation ||
          refresh !== this.refreshVersion ||
          this.state.snippet?.id !== snippet.id ||
          !this.state.editing
        )
          return;
        if (!result.ok)
          this.publish({ missing: result.error.code === 'NOT_FOUND', error: result.error.message });
        else
          this.publish({
            snippet: { ...result.value.snippet, text: snippet.text },
            missing: false,
            conflict: result.value.snippet.text !== snippet.text,
            error:
              result.value.snippet.text !== snippet.text
                ? 'Saved text changed. Your draft is kept; applying will replace it.'
                : undefined
          });
      })
      .catch(() => {
        if (generation === this.generation && refresh === this.refreshVersion)
          this.report('Unable to refresh the saved snippet. Your draft is kept.');
      });
  }
  private async load(id: string | null): Promise<void> {
    const generation = ++this.generation;
    // Keep the previous preview visible while its replacement loads; loading gates commands.
    const snippet = id === null ? null : this.state.snippet;
    const cleared = { snippet: null, draft: '', loading: false };

    this.publish({
      snippet,
      draft: snippet?.text ?? '',
      editing: false,
      loading: id !== null,
      error: undefined,
      missing: false,
      conflict: false
    });
    if (id === null) return;
    try {
      const result = await this.bridge.getSnippet({ id });

      if (this.closed || generation !== this.generation) return;
      this.publish(
        result.ok
          ? { snippet: result.value.snippet, draft: result.value.snippet.text, loading: false }
          : {
              ...cleared,
              missing: result.error.code === 'NOT_FOUND',
              error: result.error.message
            }
      );
    } catch {
      if (generation === this.generation)
        this.publish({ ...cleared, error: 'Unable to load the snippet.' });
    }
  }
  close(): void {
    this.closed = true;
    this.generation += 1;
  }
}
