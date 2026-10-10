import type { Attachment } from '../../../shared/contracts/attachments';

export async function stageDroppedAttachments(
  token: string,
  files: File[],
  scope: {
    current: () => boolean;
    busy: (pending: boolean) => void;
    change: (attachments: Attachment[]) => void;
    report: (message: string) => void;
  }
) {
  scope.busy(true);
  try {
    const result = await window.promptly.addDroppedAttachments({ draftToken: token, files });

    if (!scope.current()) return;
    if (!result.ok) scope.report(result.error.message);
    else {
      scope.change(result.value.attachments);
      const snapshot = result.value;

      if (snapshot.rejected !== undefined && snapshot.rejected.length > 0)
        scope.report(snapshot.rejected.map(({ name, reason }) => `${name}: ${reason}`).join(' '));
    }
  } catch {
    if (scope.current()) scope.report('Unable to attach files. Your draft is kept.');
  } finally {
    scope.busy(false);
  }
}
