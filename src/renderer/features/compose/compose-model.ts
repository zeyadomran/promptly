import type { Attachment } from '../../../shared/contracts/attachments';
import { type ComposeDestination, type ComposeDraft, draftIdentity } from './compose-state';
import { ComposeStore } from './compose-store';

/** One draft survives shell navigation and effect lifecycle replay. */
export class ComposeModel extends ComposeStore {
  changeText(text: string) {
    this.change({ text });
  }
  changeTags(tagIds: string[]) {
    this.change({ tagIds });
  }
  refreshAttachments(attachments: Attachment[], token = this.state.draft?.draftToken) {
    if (token !== undefined && token === this.state.draft?.draftToken) this.change({ attachments });
  }
  changeDestination(destination: ComposeDestination) {
    if (this.state.draft?.source === undefined) this.change({ destination });
  }
  open(destination: ComposeDestination, options?: { fromGlobal?: boolean }) {
    return this.load(destination, undefined, options?.fromGlobal ?? false);
  }
  editQueue(id: string) {
    return this.load('queue', id, false);
  }
  private async load(
    destination: ComposeDestination,
    queueId: string | undefined,
    fromGlobal: boolean
  ) {
    if (this.state.draft !== undefined || this.state.pending) return;
    const generation = ++this.generation;

    this.publish({ pending: true, error: undefined, saved: undefined });
    try {
      const queued =
        queueId === undefined ? undefined : await this.bridge.getQueueItem({ id: queueId });

      if (queued !== undefined && !queued.ok) {
        if (generation === this.generation) this.report(queued.error.message);
        return;
      }

      if (!this.accepts(generation)) return;
      const source = queueId === undefined ? undefined : { kind: 'queue' as const, id: queueId };
      const lease = await this.bridge.beginDraft(source === undefined ? {} : { source });

      if (!lease.ok) {
        if (generation === this.generation) this.report(lease.error.message);
        return;
      }

      if (!this.accepts(generation)) {
        await this.bridge.discardDraft({ draftToken: lease.value.token });
        return;
      }

      const text = queued?.ok === true ? queued.value.item.text : '';
      const tagIds = queued?.ok === true ? queued.value.item.tags.map(({ id }) => id) : [];
      const attachments = lease.value.attachments;

      this.publish({
        draft: {
          id: crypto.randomUUID(),
          revision: 0,
          destination,
          source,
          text,
          tagIds,
          draftToken: lease.value.token,
          attachments,
          fromGlobal,
          initial: draftIdentity(text, tagIds, attachments)
        }
      });
    } catch {
      if (generation === this.generation) this.report('Unable to start a draft. Try again.');
    } finally {
      if (generation === this.generation) this.publish({ pending: false });
    }
  }
  async save(options?: { return?: boolean }): Promise<boolean> {
    const draft = this.state.draft;

    if (draft === undefined || this.state.pending || this.state.assetPending) return false;
    if (draft.text.trim() === '' && draft.attachments.length === 0) {
      this.report('Add text or an attachment before saving.');
      return false;
    }

    const generation = ++this.generation;

    this.publish({ pending: true, error: undefined });
    try {
      const result = await this.bridge.saveWorkflowDraft({
        destination: draft.destination,
        text: draft.text,
        tagIds: draft.tagIds,
        draftToken: draft.draftToken,
        draftId: draft.id,
        draftRevision: draft.revision,
        ...(draft.source === undefined ? {} : { queueId: draft.source.id }),
        return: options?.return ?? false
      });

      if (!result.ok) {
        if (generation === this.generation) this.report(result.error.message);
        if (result.error.code === 'NOT_FOUND') await this.recoverDeletedSource(draft, generation);
        return false;
      }

      if (generation === this.generation)
        this.publish({ draft: undefined, prompt: false, saved: result.value });
      return true;
    } catch {
      if (generation === this.generation) this.report('Unable to save. Your draft is kept.');
      return false;
    } finally {
      if (generation === this.generation) this.publish({ pending: false });
    }
  }
  private async recoverDeletedSource(draft: ComposeDraft, generation: number) {
    if (draft.source === undefined || generation !== this.generation) return;
    try {
      const source = await this.bridge.getQueueItem({ id: draft.source.id });

      if (
        source.ok ||
        source.error.code !== 'NOT_FOUND' ||
        generation !== this.generation ||
        this.state.draft !== draft
      )
        return;
      const revision = draft.revision + 1;

      this.publish({
        draft: { ...draft, source: undefined, revision },
        error:
          'The queued prompt was deleted. Your draft is kept. Save it as a new prompt or choose Library.'
      });
      void this.bridge
        .invalidateCopyDraft({ draftId: draft.id, draftRevision: revision })
        .catch(() => undefined);
    } catch {
      /* Preserve the original failed-save result and editable lease. */
    }
  }
}
