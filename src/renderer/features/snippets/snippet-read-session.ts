import { draftIdentity } from '../attachments/draft-identity';
import {
  initialSnippetSession,
  type SnippetEditBridge,
  type SnippetSessionState
} from './snippet-session-state';

export class SnippetReadSession {
  protected state = initialSnippetSession();
  protected selectedId: string | null = null;
  protected generation = 0;
  protected refreshVersion = 0;
  protected closed = false;
  private readonly listeners = new Set<() => void>();
  constructor(protected readonly bridge: SnippetEditBridge) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  protected publish(update: Partial<SnippetSessionState>) {
    if (this.closed) return;
    this.state = { ...this.state, ...update };
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        /* Preserve confirmed results. */
      }
    }
  }
  protected isCurrent(generation: number) {
    return !this.closed && generation === this.generation;
  }
  protected isEditing(generation: number) {
    return this.isCurrent(generation) && this.state.editing;
  }
  get dirty() {
    const snippet = this.state.snippet;

    return (
      this.state.editing &&
      snippet !== null &&
      draftIdentity(this.state.draft, this.state.draftTags, this.state.draftAttachments) !==
        draftIdentity(
          snippet.text,
          snippet.tags.map(({ id }) => id),
          snippet.attachments
        )
    );
  }
  start() {
    this.closed = false;
    if (!this.state.editing) void this.load(this.selectedId);
  }
  close() {
    this.closed = true;
  }
  report(error: string) {
    this.publish({ error });
  }
  resetAfterClear() {
    this.generation++;
    this.refreshVersion++;
    this.selectedId = null;
    this.publish(initialSnippetSession());
  }
  refresh() {
    if (this.closed) return;
    if (!this.state.editing && !this.state.pending && !this.state.assetPending) {
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
          !this.isCurrent(generation) ||
          refresh !== this.refreshVersion ||
          this.state.snippet?.id !== snippet.id ||
          !this.state.editing
        )
          return;
        if (!result.ok) {
          this.publish({ missing: result.error.code === 'NOT_FOUND', error: result.error.message });
          return;
        }

        const current = result.value.snippet;
        const conflict =
          draftIdentity(
            current.text,
            current.tags.map(({ id }) => id),
            current.attachments
          ) !==
          draftIdentity(
            snippet.text,
            snippet.tags.map(({ id }) => id),
            snippet.attachments
          );

        this.publish({
          snippet: {
            ...current,
            text: snippet.text,
            tags: snippet.tags,
            attachments: snippet.attachments
          },
          missing: false,
          conflict,
          error: conflict
            ? 'Saved content changed. Your draft is kept; applying will replace it.'
            : undefined
        });
      })
      .catch(() => {
        if (this.isCurrent(generation) && refresh === this.refreshVersion)
          this.report('Unable to refresh the saved snippet. Your draft is kept.');
      });
  }
  protected async load(id: string | null) {
    const generation = ++this.generation;
    const snippet = id === null ? null : this.state.snippet;
    const cleared = { ...initialSnippetSession(), loading: false };

    this.publish({
      snippet,
      draft: snippet?.text ?? '',
      editing: false,
      loading: id !== null,
      error: undefined,
      missing: false,
      conflict: false,
      draftToken: undefined,
      draftAttachments: [],
      draftTags: []
    });
    if (id === null) return;
    try {
      const result = await this.bridge.getSnippet({ id });

      if (!this.isCurrent(generation)) return;
      this.publish(
        result.ok
          ? { snippet: result.value.snippet, draft: result.value.snippet.text, loading: false }
          : { ...cleared, missing: result.error.code === 'NOT_FOUND', error: result.error.message }
      );
    } catch {
      if (this.isCurrent(generation))
        this.publish({ ...cleared, error: 'Unable to load the snippet.' });
    }
  }
}
