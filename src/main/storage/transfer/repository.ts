import type { SnippetWrites } from '../../snippets/snippet-writes';
import { StorageError } from '../context';
import type { StorageRequest } from '../protocol';
import { encodeExport } from './encode-export';
import { type ImportPlan, planImport } from './import-plan';
import { writeImport } from './import-write';
import { readBackup } from './read-backup';
import { portableSnapshot } from './snapshot';

export class TransferRepository {
  private readonly plans = new Map<string, ImportPlan>();

  constructor(private readonly writes: SnippetWrites) {}

  clearPlans(): void {
    this.plans.clear();
  }

  export(input: StorageRequest<'exportLibraryData'>) {
    const { context } = this.writes.reader;

    return {
      revision: context.revision(),
      data: encodeExport(portableSnapshot(context), input.format)
    };
  }

  preview(input: StorageRequest<'prepareLibraryImport'>) {
    const { context } = this.writes.reader;

    for (const [token, pendingPlan] of this.plans) {
      if (pendingPlan.expires <= context.now().getTime()) this.plans.delete(token);
    }

    if (this.plans.size >= 4)
      throw new StorageError(
        'UNAVAILABLE',
        'Too many pending imports. Cancel an existing preview.'
      );
    const plan = planImport(context, readBackup(input.filename));

    this.plans.set(plan.preview.token, plan);
    return plan.preview;
  }

  discard(input: StorageRequest<'discardLibraryImport'>) {
    this.plans.delete(input.token);
    return {};
  }

  import(input: StorageRequest<'commitLibraryImport'>) {
    const plan = this.plans.get(input.token);
    const { context } = this.writes.reader;

    if (plan === undefined || plan.expires <= context.now().getTime())
      throw new StorageError('NOT_FOUND', 'Import preview expired. Choose the file again.');
    // The existing wrapper increments revision inside BEGIN IMMEDIATE before dispatch.
    if (plan.preview.revision !== input.revision || context.revision() !== input.revision + 1)
      throw new StorageError(
        'CONFLICT',
        'Your library changed. Choose the file again to review it.'
      );
    const result = writeImport(this.writes, plan);

    context.afterCommit(() => {
      this.plans.delete(input.token);
    });
    return result;
  }
}
