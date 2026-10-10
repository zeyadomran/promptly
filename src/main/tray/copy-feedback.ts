import type { CopyOutcome } from '../../shared/contracts/copy';

export function trayCopyFeedback(outcome: CopyOutcome): string {
  const attachments = (outcome.attachmentCount ?? 0) > 0 ? '; attachments are separate' : '';
  const statistics = outcome.warnings.length > 0 ? '; statistics unconfirmed' : '';

  return `Copied${attachments}${statistics}`;
}
