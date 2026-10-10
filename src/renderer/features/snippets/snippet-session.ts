import { SnippetEditSession } from './snippet-edit-session';

/** Owns one atomic text/tag/attachment edit independently of selection. */
export class SnippetSession extends SnippetEditSession {
  select(id: string | null, pending = false) {
    if (id === null && pending) return;
    if (this.closed || id === this.selectedId) return;
    this.selectedId = id;
    if (this.dirty || this.state.pending || this.state.assetPending) {
      this.publish({ prompt: id !== this.state.snippet?.id });
      return;
    }

    if (this.state.editing) void this.discard();
    else void this.load(id);
  }
  async save(): Promise<boolean> {
    const { snippet, draft: text, draftToken, draftTags: tagIds } = this.state;

    if (
      snippet === null ||
      this.state.loading ||
      this.state.pending ||
      this.state.assetPending ||
      this.state.missing
    )
      return false;
    if (this.bridge.beginDraft !== undefined && draftToken === undefined) {
      this.report('Attachment staging is unavailable. Cancel and reopen the edit.');
      return false;
    }

    if (text.trim() === '' && this.state.draftAttachments.length === 0) {
      this.report('Add text or an attachment before saving.');
      return false;
    }

    const generation = ++this.generation;

    this.publish({ pending: true, error: undefined });
    try {
      const result = await this.bridge.updateSnippet({
        id: snippet.id,
        text,
        tagIds,
        ...(draftToken === undefined ? {} : { draftToken })
      });

      if (!result.ok) {
        if (this.isCurrent(generation))
          this.publish({ pending: false, error: result.error.message });
        return false;
      }

      if (!this.isCurrent(generation)) return true;
      this.invalidate(this.state.draftRevision + 1);
      this.refreshVersion++;
      this.publish({
        snippet: result.value.snippet,
        draft: text,
        editing: false,
        pending: false,
        prompt: false,
        conflict: false,
        draftToken: undefined,
        draftAttachments: [],
        draftTags: []
      });
      if (this.selectedId !== snippet.id) await this.load(this.selectedId);
      return true;
    } catch {
      if (this.isCurrent(generation))
        this.publish({
          pending: false,
          error: 'The edit could not be confirmed. Your draft is kept.'
        });
      return false;
    }
  }
}
