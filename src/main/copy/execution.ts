import type { ReturnOutcome } from '../../shared/contracts/previous-app';
import type { DesktopResult } from '../../shared/contracts/result';
import { failure } from '../../shared/contracts/result';
import {
  type SavedCopySource,
  savedCopySourceSchema,
  type WorkflowCopyOutcome,
  workflowLimits
} from '../../shared/contracts/workflow-copy';
import type { TransferOwner } from '../storage/transfer/requests';
import type { PreparedCopyExecution } from '../workflows/ports';
import { clipboardText } from './text';

export interface CopyStatistics {
  revision: number;
  copyCount: number;
  lastCopiedAt: string;
}
export interface ExecutionEffects {
  platform: string;
  writeText: (text: string) => Promise<void>;
  recordCopy: (source: SavedCopySource) => Promise<DesktopResult<CopyStatistics>>;
  returnToPreviousApp?: () => Promise<ReturnOutcome>;
}

/** The caller owns LibraryMutations; this executor never adds a second serializer. */
export async function executeCopy(
  input: PreparedCopyExecution,
  signal: AbortSignal,
  owner: Pick<TransferOwner, 'isAlive'>,
  effects: ExecutionEffects,
  prepared = true
): Promise<DesktopResult<WorkflowCopyOutcome>> {
  if (
    input.text.length > workflowLimits.text ||
    input.sourceIds.length > workflowLimits.sources ||
    !Number.isInteger(input.attachmentCount) ||
    input.attachmentCount < 0 ||
    input.attachmentCount > 160 ||
    input.sourceIds.some((source) => !savedCopySourceSchema.safeParse(source).success) ||
    new Set(input.sourceIds.map((source) => `${source.kind}:${source.id}`)).size !==
      input.sourceIds.length
  )
    return failure('INVALID_REQUEST', 'The prepared copy exceeds the supported content limits.');
  const text = clipboardText(input.text, effects.platform, input.format);

  if (text === undefined)
    return failure('UNAVAILABLE', 'This text cannot be copied without changing its contents.');
  if (prepared && text.length > workflowLimits.text)
    return failure('INVALID_REQUEST', 'The formatted copy is too long.');
  signal.throwIfAborted();
  if (!owner.isAlive()) return failure('UNAUTHORIZED', 'The copy command owner closed.');
  await effects.writeText(text);
  // Every later external failure is a warning on confirmed success, never a retryable write.
  const outcome: WorkflowCopyOutcome = {
    status: 'copied',
    sourceIds: [...input.sourceIds],
    attachmentCount: input.attachmentCount,
    returned: 'not-requested',
    warnings: []
  };
  const statistics: NonNullable<WorkflowCopyOutcome['statistics']> = [];

  for (const source of input.sourceIds) {
    try {
      const result = await effects.recordCopy(source);

      if (!result.ok) throw new Error('Statistics unconfirmed');
      statistics.push({ ...source, ...result.value });
    } catch {
      if (!outcome.warnings.includes('STATISTICS_UNCONFIRMED'))
        outcome.warnings.push('STATISTICS_UNCONFIRMED');
    }
  }

  if (statistics.length > 0) outcome.statistics = statistics;
  if (input.return) {
    outcome.returned = 'unavailable';
    try {
      if (owner.isAlive() && !signal.aborted && effects.returnToPreviousApp !== undefined) {
        const result = await effects.returnToPreviousApp();

        outcome.returned = result.returned;
        if (result.label !== undefined) outcome.returnLabel = result.label;
      }

      if (outcome.returned !== 'returned') outcome.warnings.push('RETURN_UNCONFIRMED');
    } catch {
      outcome.warnings.push('RETURN_UNCONFIRMED');
    }
  }

  return { ok: true, value: outcome };
}
