import type {
  WorkflowCopyOutcome,
  WorkflowCopySource
} from '../../../shared/contracts/workflow-copy';
import type { FillModel } from '../variables/fill-model';
import { legacyCopyOutcome } from './copy-feedback';
import type { WorkflowCopyBridge, WorkflowCopyOptions } from './workflow-copy-types';

export async function routeCopy(
  bridge: WorkflowCopyBridge,
  fill: FillModel,
  source: WorkflowCopySource,
  options: WorkflowCopyOptions,
  owner: {
    current(): boolean;
    complete(outcome: WorkflowCopyOutcome): void;
    review(): void;
    error(message: string): void;
  }
): Promise<void> {
  const format = options.format ?? 'text';

  if (source.kind === 'snippet' && options.return !== true && options.asWritten !== true) {
    const result = await bridge.copySnippet({ id: source.id, format });

    if (!owner.current()) return;
    if (result.ok) {
      owner.complete(legacyCopyOutcome(result.value));
      return;
    }

    if (result.error.code !== 'TEMPLATE_REQUIRES_PREPARATION') {
      owner.error(result.error.message);
      return;
    }
  }

  await fill.open(source, format, options.asWritten === true ? 'as-written' : 'resolved');
  if (!owner.current()) return;
  const prepared = fill.snapshot().prepared;

  if (prepared !== null && (prepared.variables.length === 0 || options.asWritten === true)) {
    await fill.copy(options.return === true, options.asWritten === true);
    if (owner.current() && fill.snapshot().active) owner.review();
  } else owner.review();
}
