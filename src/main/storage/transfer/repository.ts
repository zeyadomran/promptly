import type { SnippetWrites } from '../../snippets/snippet-writes';
import { StorageError } from '../context';
import type { StorageRequest } from '../protocol';
import { type ImportPlan, planImport } from './import-plan';
import { writeImport } from './import-write';
import { libraryIdentity } from './library-identity';
import { stageBackup } from './stage-backup';
import { writeExport } from './stream-export';

export class TransferRepository {
  private readonly plans = new Map<string, ImportPlan>();
  private readonly expiry = new Map<string, NodeJS.Timeout>();

  constructor(private readonly writes: SnippetWrites) {}

  clearPlans(): void {
    for (const token of this.plans.keys()) this.remove(token);
  }

  export(input: StorageRequest<'exportLibraryData'>) {
    const { context } = this.writes.reader;

    writeExport(context, input.descriptor, input.format);
    return { revision: context.revision() };
  }

  preview(input: StorageRequest<'prepareLibraryImport'>) {
    const { context } = this.writes.reader;

    for (const [token, pendingPlan] of this.plans) {
      if (pendingPlan.expires <= context.now().getTime()) this.remove(token);
    }

    if (this.plans.size >= 4)
      throw new StorageError(
        'UNAVAILABLE',
        'Too many pending imports. Cancel an existing preview.'
      );
    const stage = stageBackup(input.filename);
    let plan: ImportPlan;

    try {
      plan = planImport(context, stage);
    } catch (error) {
      stage.close();
      throw error;
    }

    this.plans.set(plan.preview.token, plan);
    this.expiry.set(
      plan.preview.token,
      setTimeout(() => {
        this.remove(plan.preview.token);
      }, 5 * 60_000).unref()
    );
    return plan.preview;
  }

  discard(input: StorageRequest<'discardLibraryImport'>) {
    this.remove(input.token);
    return {};
  }

  import(input: StorageRequest<'commitLibraryImport'>) {
    const plan = this.plans.get(input.token);
    const { context } = this.writes.reader;

    if (plan === undefined || plan.expires <= context.now().getTime())
      throw new StorageError('NOT_FOUND', 'Import preview expired. Choose the file again.');
    if (plan.preview.revision !== input.revision || libraryIdentity(context) !== plan.identity)
      throw new StorageError(
        'CONFLICT',
        'Your library changed. Choose the file again to review it.'
      );
    const result = writeImport(this.writes, plan);

    context.afterCommit(() => {
      this.remove(input.token);
    });
    return result;
  }

  private remove(token: string): void {
    const plan = this.plans.get(token);

    clearTimeout(this.expiry.get(token));
    this.expiry.delete(token);
    this.plans.delete(token);
    plan?.stage.close();
  }
}
