import type { OperationRequest } from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import type { StorageClient } from '../storage/client';
import type { LibraryMutations } from '../storage/library-mutations';
import type { StorageRequest } from '../storage/protocol';
import type { TransferOwner } from '../storage/transfer/requests';
import { AttachmentActions } from './actions';
import { imageHeader, previewable } from './image-header';
import type { AssetEffects, AssetIntake } from './ports';
import { attachmentServices } from './services';

export class AttachmentService {
  private readonly drafts = new Map<
    string,
    { owner: TransferOwner; stop: () => void; retired: boolean }
  >();
  private closing = false;
  private readonly pendingBegins = new Set<Promise<unknown>>();
  constructor(
    readonly storage: Pick<StorageClient, 'call'>,
    readonly mutations: LibraryMutations,
    readonly effects: AssetEffects
  ) {}
  private isClosing(): boolean {
    return this.closing;
  }
  owner(context?: { senderId: number }) {
    const owner = context === undefined ? undefined : this.effects.owner(context.senderId);

    return !this.closing && owner?.isAlive() === true ? owner : undefined;
  }
  owns(token: string, context?: { senderId: number }): boolean {
    const scope = this.drafts.get(token);

    return (
      !this.closing &&
      context !== undefined &&
      scope?.owner.id === context.senderId &&
      !scope.retired &&
      scope.owner.isAlive()
    );
  }
  private forget(token: string): void {
    this.drafts.get(token)?.stop();
    this.drafts.delete(token);
  }
  begin(input: OperationRequest<'beginDraft'>, context?: { senderId: number }) {
    const operation = this.beginOwned(input, context);

    this.pendingBegins.add(operation);
    void operation.finally(() => this.pendingBegins.delete(operation)).catch(() => undefined);
    return operation;
  }
  private async beginOwned(input: OperationRequest<'beginDraft'>, context?: { senderId: number }) {
    const owner = this.owner(context);

    if (owner === undefined || this.closing)
      return failure('UNAUTHORIZED', 'The draft window is unavailable.');
    const result = await this.mutations.run(() =>
      this.closing || !owner.isAlive()
        ? Promise.resolve(failure('UNAUTHORIZED', 'The draft window closed.'))
        : this.storage.call('beginAssetDraft', input)
    );

    if (result.ok) {
      const token = result.value.token;

      this.drafts.set(token, { owner, retired: true, stop: () => undefined });
      if (this.isClosing() || !owner.isAlive()) {
        await this.discard({ draftToken: token }, context);
        return failure('UNAUTHORIZED', 'The draft window closed.');
      }

      this.drafts.set(token, {
        owner,
        retired: false,
        stop: owner.onClose(() => {
          void this.discard({ draftToken: token }, context);
        })
      });
    }

    return result;
  }
  async discard(input: OperationRequest<'discardDraft'>, context?: { senderId: number }) {
    const scope = this.drafts.get(input.draftToken);

    if (scope === undefined || scope.owner.id !== context?.senderId)
      return failure('UNAUTHORIZED', 'This attachment draft belongs to another window.');
    scope.retired = true;
    scope.stop();
    // Cleanup is worker-serialized even when a library barrier has retired normal saves.
    const result = await this.storage.call('discardAssetDraft', input);

    if (result.ok) this.forget(input.draftToken);
    return result;
  }
  async content<
    K extends 'createSnippet' | 'updateSnippet' | 'createQueueItem' | 'updateQueueItem'
  >(name: K, input: StorageRequest<K>, context?: { senderId: number }) {
    if (input.draftToken !== undefined && !this.owns(input.draftToken, context))
      return failure('UNAUTHORIZED', 'This attachment draft is unavailable.');
    const result = await this.mutations.run(() =>
      input.draftToken !== undefined && !this.owns(input.draftToken, context)
        ? Promise.resolve(failure('UNAUTHORIZED', 'This attachment draft is unavailable.'))
        : this.storage.call(name, input)
    );

    if (result.ok && input.draftToken !== undefined) this.forget(input.draftToken);
    return result;
  }
  async intake(token: string, files: AssetIntake[], context?: { senderId: number }) {
    if (!this.owns(token, context))
      return failure('UNAUTHORIZED', 'This attachment draft is unavailable.');
    const draft = await this.storage.call('getAssetDraft', { draftToken: token });

    if (!draft.ok) return draft;
    if (draft.value.attachments.length + files.length > 8)
      return failure('INVALID_REQUEST', 'An entry can have up to 8 attachments.');
    const inputs = files.map((file) => {
      let dimensions = imageHeader(file.bytes);

      if (previewable(dimensions)) {
        try {
          this.effects.raster(file.bytes, 160);
        } catch {
          dimensions = undefined;
        }
      }

      const image = previewable(dimensions) ? dimensions : null;

      return {
        name: file.name,
        bytes: new Uint8Array(file.bytes),
        mimeType: file.mimeType,
        kind: image === null ? ('file' as const) : ('image' as const),
        width: image?.width ?? null,
        height: image?.height ?? null
      };
    });

    if (!this.owns(token, context)) return failure('UNAUTHORIZED', 'The draft window closed.');
    return this.mutations.run(() =>
      this.owns(token, context)
        ? this.storage.call('storeDraftAttachments', { draftToken: token, files: inputs })
        : Promise.resolve(failure('UNAUTHORIZED', 'The draft window closed.'))
    );
  }
  readonly services = attachmentServices(this, new AttachmentActions(this));
  async close() {
    this.closing = true;
    await Promise.allSettled([...this.pendingBegins]);
    const results = await Promise.all(
      [...this.drafts.entries()].map(([draftToken, scope]) =>
        this.discard({ draftToken }, { senderId: scope.owner.id })
      )
    );

    if (results.some((result) => !result.ok))
      throw new Error('Unable to discard attachment drafts.');
  }
}
