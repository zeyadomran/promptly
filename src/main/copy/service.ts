import type { CopyOutcome } from '../../shared/contracts/copy';
import type { DesktopOperations } from '../../shared/contracts/operations';
import type { DesktopResult } from '../../shared/contracts/result';
import { failure } from '../../shared/contracts/result';
import type { WorkflowCopyOutcome } from '../../shared/contracts/workflow-copy';
import { hasVariables } from '../../shared/workflows/template';
import type { StorageClient } from '../storage/client';
import type { LibraryMutations } from '../storage/library-mutations';
import type { TransferOwner } from '../storage/transfer/requests';
import type { PreparedCopyResolver } from '../workflows/ports';
import { type CopyStatistics, executeCopy, type ExecutionEffects } from './execution';
import type { MainCopyOwner } from './main-owner';
import { CopyRequests } from './requests';

export interface CopyEffects extends Omit<ExecutionEffects, 'recordCopy'> {
  owner: (id: number) => TransferOwner | undefined;
  recordCopy?: ExecutionEffects['recordCopy'];
  variablesEnabled?: () => boolean;
}

export class CopyService {
  private readonly requests: CopyRequests;

  constructor(
    private readonly storage: Pick<StorageClient, 'call'>,
    private readonly mutations: LibraryMutations,
    private readonly effects: CopyEffects
  ) {
    this.requests = new CopyRequests(effects.owner);
  }

  readonly services: Pick<DesktopOperations, 'copySnippet'> = {
    copySnippet: (input, context) =>
      this.requests.run(context, (signal, owner) => this.copy(input, signal, owner))
  };

  copyFromMain(input: { id: string; format: 'text' | 'markdown' }, owner: MainCopyOwner) {
    return this.requests.runMain(owner, (signal) => this.copy(input, signal, owner));
  }

  executePrepared(context: { senderId: number }, resolve: PreparedCopyResolver) {
    return this.requests.run(context, (signal, owner) => this.prepared(resolve, signal, owner));
  }

  executePreparedFromMain(owner: MainCopyOwner, resolve: PreparedCopyResolver) {
    return this.requests.runMain(owner, (signal) => this.prepared(resolve, signal, owner));
  }

  private prepared(
    resolve: PreparedCopyResolver,
    signal: AbortSignal,
    owner: Pick<TransferOwner, 'isAlive'>
  ): Promise<DesktopResult<WorkflowCopyOutcome>> {
    return this.mutations.run(async () => {
      signal.throwIfAborted();
      const result = await resolve(signal);

      if (!result.ok) return result;
      return executeCopy(result.value, signal, owner, this.executionEffects());
    });
  }

  private copy(
    input: { id: string; format: 'text' | 'markdown' },
    signal: AbortSignal,
    owner: Pick<TransferOwner, 'isAlive'>
  ): Promise<DesktopResult<CopyOutcome>> {
    return this.mutations.run(async () => {
      signal.throwIfAborted();
      const snapshot = await this.storage.call('getSnippet', { id: input.id });

      if (!snapshot.ok) return snapshot;
      if (snapshot.value.snippet.text.trim() === '')
        return failure('UNAVAILABLE', 'No text to copy. Attachments are copied separately.');
      if (this.effects.variablesEnabled?.() !== false && hasVariables(snapshot.value.snippet.text))
        return failure(
          'TEMPLATE_REQUIRES_PREPARATION',
          'Fill in values or choose Copy as written before copying this template.'
        );
      const copied = await executeCopy(
        {
          text: snapshot.value.snippet.text,
          sourceIds: [{ kind: 'snippet', id: input.id }],
          format: input.format,
          return: false,
          attachmentCount: snapshot.value.snippet.attachments.length
        },
        signal,
        owner,
        this.executionEffects(),
        false
      );

      if (!copied.ok) return copied;
      const outcome: CopyOutcome = {
        status: 'copied',
        id: input.id,
        attachmentCount: copied.value.attachmentCount,
        warnings: []
      };
      const statistics = copied.value.statistics?.[0];

      if (copied.value.warnings.includes('STATISTICS_UNCONFIRMED'))
        outcome.warnings.push('STATISTICS_UNCONFIRMED');
      if (statistics !== undefined)
        outcome.statistics = {
          revision: statistics.revision,
          copyCount: statistics.copyCount,
          lastCopiedAt: statistics.lastCopiedAt
        };
      return { ok: true, value: outcome };
    });
  }

  private executionEffects(): ExecutionEffects {
    return {
      ...this.effects,
      recordCopy: this.effects.recordCopy ?? ((source) => this.record(source.id, source.kind))
    };
  }

  private async record(id: string, kind: string): Promise<DesktopResult<CopyStatistics>> {
    if (kind !== 'snippet') return failure('UNAVAILABLE', 'Queue copy statistics are unavailable.');
    const result = await this.storage.call('recordSuccessfulCopy', { id });

    if (!result.ok) return result;
    if (result.value.snippet.lastCopiedAt === null)
      return failure('UNAVAILABLE', 'Copy statistics were not confirmed.');
    return {
      ok: true,
      value: {
        revision: result.value.revision,
        copyCount: result.value.snippet.copyCount,
        lastCopiedAt: result.value.snippet.lastCopiedAt
      }
    };
  }

  close(): Promise<void> {
    return this.requests.close();
  }
}
