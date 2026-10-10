import type { Attachment } from '../../../shared/contracts/attachments';
import type { WorkflowCopySource } from '../../../shared/contracts/workflow-copy';
import { SnippetReadSession } from './snippet-read-session';
import type { SnippetSessionState } from './snippet-session-state';

export class SnippetEditSession extends SnippetReadSession {
  async edit() {
    const snippet = this.state.snippet;

    if (snippet === null || this.state.loading || this.state.editing) return;
    this.refreshVersion++;
    const generation = this.generation;

    this.publish({
      editing: true,
      draft: snippet.text,
      draftId: crypto.randomUUID(),
      draftRevision: 0,
      draftTags: snippet.tags.map(({ id }) => id),
      draftAttachments: snippet.attachments,
      draftToken: undefined,
      pending: this.bridge.beginDraft !== undefined,
      error: undefined
    });
    try {
      const lease = await this.bridge.beginDraft?.({ source: { kind: 'snippet', id: snippet.id } });

      if (lease === undefined) return;
      if (!this.isEditing(generation)) {
        if (lease.ok) await this.bridge.discardDraft?.({ draftToken: lease.value.token });
        return;
      }

      if (!lease.ok) {
        this.report(lease.error.message);
        return;
      }

      this.publish({ draftToken: lease.value.token, draftAttachments: lease.value.attachments });
    } catch {
      if (this.isCurrent(generation))
        this.report('Unable to stage attachments. Your edit is kept.');
    } finally {
      if (this.isCurrent(generation)) this.publish({ pending: false });
    }
  }
  protected changeDraft(
    patch: Partial<Pick<SnippetSessionState, 'draft' | 'draftTags' | 'draftAttachments'>>
  ) {
    if (!this.state.editing || this.state.pending) return;
    const draftRevision = this.state.draftRevision + 1;

    this.publish({ ...patch, draftRevision, error: undefined });
    this.invalidate(draftRevision);
  }
  change(draft: string) {
    this.changeDraft({ draft });
  }
  changeTags(draftTags: string[]) {
    this.changeDraft({ draftTags });
  }
  refreshAttachments(draftAttachments: Attachment[], token = this.state.draftToken) {
    if (token === this.state.draftToken) this.changeDraft({ draftAttachments });
  }
  setAssetPending(token: string, pending: boolean) {
    if (this.state.draftToken === token) this.publish({ assetPending: pending });
  }
  protected invalidate(revision: number) {
    void this.bridge
      .invalidateCopyDraft?.({ draftId: this.state.draftId, draftRevision: revision })
      .catch(() => undefined);
  }
  currentCopySource = (): WorkflowCopySource | undefined =>
    this.state.editing
      ? {
          kind: 'draft',
          draftId: this.state.draftId,
          draftRevision: this.state.draftRevision,
          text: this.state.draft,
          attachmentCount: this.state.draftAttachments.length
        }
      : undefined;
  warnModeChange() {
    if (this.dirty) this.publish({ prompt: true });
  }
  keep() {
    this.publish({ prompt: false });
  }
  async requestExit(): Promise<boolean> {
    if (!this.state.editing) return true;
    if (this.state.pending || this.state.assetPending) return false;
    if (this.dirty) {
      this.warnModeChange();
      return false;
    }

    await this.discard();
    return !this.state.editing;
  }
  async discard() {
    if (!this.state.editing || this.state.pending || this.state.assetPending) return;
    const token = this.state.draftToken;
    const generation = ++this.generation;

    this.publish({ pending: true, error: undefined });

    try {
      const result =
        token === undefined ? undefined : await this.bridge.discardDraft?.({ draftToken: token });

      if (!this.isCurrent(generation)) return;
      if (result !== undefined && !result.ok && result.error.code !== 'NOT_FOUND') {
        this.report(result.error.message);
        return;
      }

      this.invalidate(this.state.draftRevision + 1);
      this.publish({
        editing: false,
        pending: false,
        prompt: false,
        draftToken: undefined,
        draftAttachments: [],
        draftTags: []
      });
      await this.load(this.selectedId);
    } catch {
      if (this.isCurrent(generation))
        this.report('Unable to release staged attachments. Your edit is kept.');
    } finally {
      if (this.isCurrent(generation)) this.publish({ pending: false });
    }
  }
}
