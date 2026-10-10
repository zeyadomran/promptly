import type { CopyOutcome } from '../../../shared/contracts/copy';
import type { WorkflowCopyOutcome } from '../../../shared/contracts/workflow-copy';

export function workflowCopyFeedback(outcome: WorkflowCopyOutcome): string {
  const attachments = outcome.attachmentCount > 0 ? ' Attachments are separate.' : '';
  const returned =
    outcome.returned === 'returned'
      ? ` Returned to ${outcome.returnLabel ?? 'the previous app'}.`
      : ['unavailable', 'denied'].includes(outcome.returned)
        ? ' Return was unavailable.'
        : '';
  const warning = outcome.warnings.includes('STATISTICS_UNCONFIRMED')
    ? ' Statistics unconfirmed.'
    : '';

  return `Copied.${attachments}${returned}${warning}`;
}

export function legacyCopyOutcome(outcome: CopyOutcome): WorkflowCopyOutcome {
  return {
    status: 'copied',
    sourceIds: [{ kind: 'snippet', id: outcome.id }],
    attachmentCount:
      'attachmentCount' in outcome && typeof outcome.attachmentCount === 'number'
        ? outcome.attachmentCount
        : 0,
    returned: 'not-requested',
    warnings: outcome.warnings,
    ...(outcome.statistics === undefined
      ? {}
      : { statistics: [{ kind: 'snippet' as const, id: outcome.id, ...outcome.statistics }] })
  };
}
