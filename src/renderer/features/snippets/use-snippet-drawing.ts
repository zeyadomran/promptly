import { useDrawing } from '../drawing/useDrawing';
import { useSnippetSession } from './snippet-context';

export function useSnippetDrawing() {
  const drawing = useDrawing();
  const { session } = useSnippetSession();
  const open = async (attachmentId?: string) => {
    const id = session.snapshot().snippet?.id;

    await session.edit();
    const state = session.snapshot();
    const token = state.draftToken;

    if (token === undefined || !state.editing || state.snippet?.id !== id) return;
    try {
      await drawing.open({
        draftToken: token,
        attachments: state.draftAttachments,
        saveTarget: 'snippet',
        ...(attachmentId === undefined ? {} : { attachmentId }),
        onSaved: (attachments) => {
          session.refreshAttachments(attachments, token);
        }
      });
    } catch {
      if (session.snapshot().draftToken === token)
        session.report('Unable to open the drawing editor. Your edit is kept.');
    }
  };

  return { open, isOpen: drawing.isOpen };
}
