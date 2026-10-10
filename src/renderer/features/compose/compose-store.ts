import type { WorkflowCopySource } from '../../../shared/contracts/workflow-copy';
import {
  type ComposeBridge,
  type ComposeDraft,
  type ComposeState,
  draftIdentity
} from './compose-state';

export class ComposeStore {
  protected state: ComposeState = {
    draft: undefined,
    pending: false,
    assetPending: false,
    prompt: false,
    error: undefined,
    saved: undefined
  };
  protected generation = 0;
  protected active = true;
  private readonly listeners = new Set<() => void>();
  constructor(readonly bridge: ComposeBridge) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  protected publish(patch: Partial<ComposeState>) {
    this.state = { ...this.state, ...patch };
    if (this.active)
      for (const listener of this.listeners) {
        try {
          listener();
        } catch {
          /* Observers cannot change a confirmed outcome. */
        }
      }
  }
  start() {
    this.active = true;
  }
  close() {
    this.active = false;
  }
  protected accepts(generation: number) {
    return this.active && generation === this.generation;
  }
  get dirty() {
    const draft = this.state.draft;

    return (
      draft !== undefined &&
      draft.initial !== draftIdentity(draft.text, draft.tagIds, draft.attachments)
    );
  }
  change(patch: Partial<Pick<ComposeDraft, 'text' | 'tagIds' | 'attachments' | 'destination'>>) {
    const current = this.state.draft;

    if (current === undefined || this.state.pending) return;
    const draft = { ...current, ...patch, revision: current.revision + 1 };

    this.publish({ draft, error: undefined });
    void this.bridge
      .invalidateCopyDraft({ draftId: draft.id, draftRevision: draft.revision })
      .catch(() => undefined);
  }
  currentCopySource = (): WorkflowCopySource | undefined => {
    const draft = this.state.draft;

    return draft === undefined
      ? undefined
      : {
          kind: 'draft',
          draftId: draft.id,
          draftRevision: draft.revision,
          text: draft.text,
          attachmentCount: draft.attachments.length
        };
  };
  report(error: string) {
    this.publish({ error });
  }
  setAssetPending(token: string, pending: boolean) {
    if (this.state.draft?.draftToken === token) this.publish({ assetPending: pending });
  }
  keep() {
    this.publish({ prompt: false });
  }
  resetAfterClear() {
    this.generation++;
    this.publish({
      draft: undefined,
      pending: false,
      assetPending: false,
      prompt: false,
      error: undefined,
      saved: undefined
    });
  }
  requestClose() {
    if (this.state.pending || this.state.assetPending) return;
    if (this.dirty) this.publish({ prompt: true });
    else void this.discard();
  }
  async discard() {
    const draft = this.state.draft;

    if (draft === undefined || this.state.pending || this.state.assetPending) return;
    const generation = ++this.generation;

    this.publish({ pending: true, error: undefined });
    try {
      const result = await this.bridge.discardDraft({ draftToken: draft.draftToken });

      if (generation !== this.generation) return;
      if (!result.ok && result.error.code !== 'NOT_FOUND') {
        this.report(result.error.message);
        return;
      }

      void this.bridge
        .invalidateCopyDraft({ draftId: draft.id, draftRevision: draft.revision + 1 })
        .catch(() => undefined);
      this.publish({ draft: undefined, prompt: false });
    } catch {
      if (generation === this.generation)
        this.report('Unable to discard attachments. Your draft is kept.');
    } finally {
      if (generation === this.generation) this.publish({ pending: false });
    }
  }
}
