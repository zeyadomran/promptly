import type { Attachment } from '../../../shared/contracts/attachments';
import type { DrawingSession } from './drawing-session';
import { drawingToken, imageAttachment } from './drawing-test-fixture';

export async function assertDrawingCapacity(session: DrawingSession, drawing: Attachment) {
  const attachments = [
    imageAttachment,
    ...Array.from({ length: 6 }, () => ({ ...imageAttachment, id: crypto.randomUUID() })),
    drawing
  ];
  const options = { draftToken: drawingToken, attachments, onSaved: () => undefined };
  const opened: boolean[] = [];

  await session.open(options);
  opened.push(session.snapshot().isOpen);
  session.retire();
  await session.open({ ...options, attachmentId: imageAttachment.id });
  opened.push(session.snapshot().isOpen);
  session.retire();
  await session.open({ ...options, attachmentId: drawing.id });
  return opened;
}
