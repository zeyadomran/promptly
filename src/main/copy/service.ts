import type { CopyOutcome } from '../../shared/contracts/copy';
import type { DesktopOperations } from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import { type Settings, shouldHideAfterCopy } from '../../shared/contracts/settings';
import type { StorageClient } from '../storage/client';
import type { LibraryMutations } from '../storage/library-mutations';
import type { TransferOwner } from '../storage/transfer/requests';
import { CopyRequests } from './requests';
import { clipboardText } from './text';

export interface CopyEffects {
  platform: string;
  owner: (id: number) => TransferOwner | undefined;
  writeText: (text: string) => Promise<void>;
  settings: () => Settings;
  hide: (owner: TransferOwner) => Promise<boolean>;
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
      this.requests.run(context, (signal, owner) =>
        this.mutations.run(async () => {
          signal.throwIfAborted();
          const snapshot = await this.storage.call('getSnippet', { id: input.id });

          if (!snapshot.ok) return snapshot;
          const text = clipboardText(
            snapshot.value.snippet.text,
            this.effects.platform,
            input.format
          );

          if (text === undefined)
            return failure(
              'UNAVAILABLE',
              'This text cannot be copied without changing its contents.'
            );
          signal.throwIfAborted();
          if (!owner.isAlive()) return failure('UNAUTHORIZED', 'The originating window closed.');
          await this.effects.writeText(text);
          // Beyond this point, never convert partial success into a retryable copy failure.
          const outcome: CopyOutcome = { status: 'copied', id: input.id, warnings: [] };

          try {
            const result = await this.storage.call('recordSuccessfulCopy', { id: input.id });

            if (!result.ok || result.value.snippet.lastCopiedAt === null)
              outcome.warnings.push('STATISTICS_UNCONFIRMED');
            else
              outcome.statistics = {
                revision: result.value.revision,
                copyCount: result.value.snippet.copyCount,
                lastCopiedAt: result.value.snippet.lastCopiedAt
              };
          } catch {
            outcome.warnings.push('STATISTICS_UNCONFIRMED');
          }

          try {
            if (shouldHideAfterCopy(this.effects.settings())) {
              if (signal.aborted || !owner.isAlive() || !(await this.effects.hide(owner)))
                outcome.warnings.push('WINDOW_NOT_HIDDEN');
            }
          } catch {
            outcome.warnings.push('WINDOW_NOT_HIDDEN');
          }

          return { ok: true, value: outcome };
        })
      )
  };

  close(): Promise<void> {
    return this.requests.close();
  }
}
