import { randomUUID } from 'node:crypto';

import { failure } from '../../shared/contracts/result';
import type { CommitCopy, WorkflowCopyOperations } from '../../shared/contracts/workflow-copy';
import { workflowCopyOperations } from '../../shared/contracts/workflow-copy';
import { resolveTemplate } from '../../shared/workflows/template';
import type { TransferOwner } from '../storage/transfer/requests';
import { TransferRequests } from '../storage/transfer/requests';
import { contentFingerprint, prepareContent } from './content';
import type { WorkflowCopyPorts } from './ports';
import { PreparedTokens } from './tokens';

export class WorkflowCopyService {
  private readonly requests: TransferRequests;
  private readonly tokens: PreparedTokens;
  private readonly now: () => number;
  private preparationGeneration = 0;
  constructor(private readonly ports: WorkflowCopyPorts) {
    this.requests = new TransferRequests(ports.owner);
    this.now = ports.now ?? Date.now;
    this.tokens = new PreparedTokens(this.now);
  }
  readonly services: WorkflowCopyOperations = {
    prepareCopy: (input, context) =>
      this.requests.run(context, async ({ owner, signal }) => {
        const generation = this.preparationGeneration;
        const parsed = workflowCopyOperations.prepareCopy.request.safeParse(input);

        if (!parsed.success) return failure('INVALID_REQUEST', 'Invalid copy source.');
        const mode = parsed.data.mode ?? 'resolved';
        const content = await prepareContent(parsed.data.source, this.ports, signal, mode);

        if (!content.ok) return content;
        signal.throwIfAborted();
        if (generation !== this.preparationGeneration)
          return failure(
            'PREPARATION_EXPIRED',
            'The library was cleared. Prepare this text again.'
          );
        const prepared = {
          ...content.value,
          mode,
          token: randomUUID(),
          expiresAt: this.now() + 300_000
        };

        if (!this.tokens.put(prepared, owner))
          return failure('UNAVAILABLE', 'Too many copy preparations are open.');
        return { ok: true, value: prepared };
      }),
    commitCopy: (input, context) =>
      this.requests.run(context, async ({ owner }) => {
        const parsed = workflowCopyOperations.commitCopy.request.safeParse(input);

        if (!parsed.success) return failure('INVALID_REQUEST', 'Invalid copy answers.');
        const result = await this.ports.executePrepared({ senderId: owner.id }, (signal) =>
          this.resolve(parsed.data, owner, signal)
        );

        if (result.ok) this.tokens.remove(parsed.data.token);
        return result;
      }),
    invalidateCopyDraft: (input, context) => {
      const owner = context === undefined ? undefined : this.ports.owner(context.senderId);

      if (owner?.isAlive() !== true)
        return Promise.resolve(failure('UNAUTHORIZED', 'The originating window is unavailable.'));
      const parsed = workflowCopyOperations.invalidateCopyDraft.request.safeParse(input);

      if (!parsed.success)
        return Promise.resolve(failure('INVALID_REQUEST', 'Invalid draft revision.'));
      this.invalidateDraft(owner.id, parsed.data.draftId, parsed.data.draftRevision);
      return Promise.resolve({ ok: true, value: {} });
    },
    cancelPreparedCopy: (input, context) => {
      const owner = context === undefined ? undefined : this.ports.owner(context.senderId);

      if (owner?.isAlive() !== true)
        return Promise.resolve(failure('UNAUTHORIZED', 'The originating window is unavailable.'));
      const parsed = workflowCopyOperations.cancelPreparedCopy.request.safeParse(input);

      if (!parsed.success)
        return Promise.resolve(failure('INVALID_REQUEST', 'Invalid copy token.'));
      const entry = this.tokens.get(parsed.data.token, owner);

      if (entry === undefined)
        return Promise.resolve(failure('PREPARATION_EXPIRED', 'This copy preparation expired.'));
      this.tokens.remove(parsed.data.token);
      return Promise.resolve({ ok: true, value: {} });
    }
  };
  private async resolve(input: CommitCopy, owner: TransferOwner, signal: AbortSignal) {
    const entry = this.tokens.get(input.token, owner);

    if (entry === undefined)
      return failure(
        'PREPARATION_EXPIRED',
        'This copy preparation expired. Prepare the text again.'
      );
    const prepared = entry.prepared;

    if (prepared.mode === 'as-written' && input.mode !== 'as-written')
      return failure('INVALID_REQUEST', 'This preparation can only copy text as written.');

    if (
      entry.invalidated ||
      (prepared.source.kind === 'draft' && input.draftRevision !== prepared.source.draftRevision)
    )
      return failure('CONFLICT', 'Your draft changed. Check the values again.');
    for (const segment of prepared.segments) {
      signal.throwIfAborted();
      if (segment.kind === 'draft') continue;
      const current = await this.ports.lookup({ kind: segment.kind, id: segment.id });

      if (!current.ok) return current;
      if (contentFingerprint(current.value) !== segment.fingerprint)
        return failure('CONFLICT', 'The saved text changed. Check the values again.');
    }

    if (
      Object.keys(input.values).some(
        (name) => !prepared.variables.some((variable) => variable.name === name)
      )
    )
      return failure('INVALID_REQUEST', 'Answers must belong to the prepared variables.');
    try {
      const resolved =
        input.mode === 'resolved' && prepared.variables.length > 0
          ? resolveTemplate(prepared.text, input.values)
          : { text: prepared.text, unresolved: [] };

      if (resolved.unresolved.length > 0)
        return failure('INVALID_REQUEST', 'Fill every value or choose Leave blank.');
      signal.throwIfAborted();
      if (this.tokens.get(input.token, owner) !== entry)
        return failure(
          'PREPARATION_EXPIRED',
          'This copy preparation expired. Prepare the text again.'
        );
      if (!owner.isAlive()) return failure('UNAUTHORIZED', 'The copy command owner closed.');
      return {
        ok: true as const,
        value: {
          text: resolved.text,
          sourceIds: prepared.segments.flatMap((segment) =>
            segment.kind === 'draft' ? [] : [{ kind: segment.kind, id: segment.id }]
          ),
          format: input.format,
          return: input.return,
          attachmentCount: prepared.attachmentCount
        }
      };
    } catch {
      return failure('INVALID_REQUEST', 'This resolved text is too long to copy.');
    }
  }
  invalidateDraft(senderId: number, draftId: string, revision: number): void {
    this.tokens.invalidateDraft(senderId, draftId, revision);
  }
  retirePreparations(): void {
    this.preparationGeneration += 1;
    this.tokens.clear();
  }
  async close(): Promise<void> {
    this.retirePreparations();
    await this.requests.close();
    this.tokens.clear();
  }
}
