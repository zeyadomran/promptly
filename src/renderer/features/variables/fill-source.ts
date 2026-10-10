import type { WorkflowCopySource } from '../../../shared/contracts/workflow-copy';

export function copySourceState(
  prepared: WorkflowCopySource,
  current: WorkflowCopySource | undefined
) {
  if (prepared.kind !== current?.kind) return 'missing';
  if (prepared.kind !== 'draft' || current.kind !== 'draft') return 'ready';
  if (prepared.draftId !== current.draftId) return 'missing';
  return prepared.draftRevision === current.draftRevision ? 'ready' : 'changed';
}
