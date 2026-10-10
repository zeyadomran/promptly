import { ClipboardPaste, Paperclip, Pencil } from 'lucide-react';
import { useState } from 'react';

import type { Attachment } from '../../../shared/contracts/attachments';
import type { DesktopResult } from '../../../shared/contracts/result';
import { Button } from '../../components/ui/button';
import { AttachmentChip } from './AttachmentChip';

export interface AttachmentStripProps {
  attachments: Attachment[];
  draftToken?: string;
  editable?: boolean;
  pending?: boolean;
  onChange?: (attachments: Attachment[], draftToken: string) => void;
  onError?: (message: string, draftToken?: string) => void;
  onAnnotate?: (attachmentId: string) => void;
  onDraw?: () => void;
  onBusy?: (busy: boolean, draftToken: string) => void;
  saveTarget?: 'prompt' | 'snippet';
}
export function AttachmentStrip({
  attachments,
  draftToken,
  editable = false,
  pending = false,
  onChange,
  onError,
  onAnnotate,
  onDraw,
  onBusy
}: AttachmentStripProps) {
  const [message, setMessage] = useState<string>();
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const report = (error: string) => {
    setMessage(error);
    onError?.(error, draftToken);
  };

  const run = async (
    action: () => Promise<
      DesktopResult<{
        token: string;
        attachments: Attachment[];
        rejected?: { name: string; reason: string }[];
      }>
    >
  ) => {
    if (busy || pending || draftToken === undefined) return;
    setBusy(true);
    onBusy?.(true, draftToken);
    setMessage(undefined);
    try {
      const result = await action();

      if (!result.ok) report(result.error.message);
      else {
        onChange?.(result.value.attachments, draftToken);
        if (result.value.rejected !== undefined && result.value.rejected.length > 0)
          report(result.value.rejected.map(({ name, reason }) => `${name}: ${reason}`).join(' '));
      }
    } catch {
      report('Unable to attach. Your draft is kept.');
    } finally {
      setBusy(false);
      onBusy?.(false, draftToken);
    }
  };

  const paste = () => {
    if (draftToken !== undefined) void run(() => window.promptly.pasteAttachment({ draftToken }));
  };

  return (
    <section
      className="attachment-strip"
      aria-label="Attachments"
      data-dragging={drag}
      onDragOver={(event) => {
        if (!editable || !event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        event.stopPropagation();
        setDrag(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrag(false);
      }}
      onDrop={(event) => {
        if (!editable || draftToken === undefined) return;
        event.preventDefault();
        event.stopPropagation();
        setDrag(false);
        const files = Array.from(event.dataTransfer.files);

        void run(() => window.promptly.addDroppedAttachments({ draftToken, files }));
      }}
      onKeyDown={(event) => {
        if (
          editable &&
          event.ctrlKey &&
          event.shiftKey &&
          !event.altKey &&
          event.key.toLowerCase() === 'v' &&
          !event.nativeEvent.isComposing
        ) {
          event.preventDefault();
          event.stopPropagation();
          paste();
        }
      }}
    >
      {attachments.length > 0 && (
        <div className="attachment-chips">
          {attachments.map((attachment) => (
            <AttachmentChip
              key={attachment.id}
              attachment={attachment}
              draftToken={draftToken}
              editable={editable}
              pending={pending || busy}
              {...(onAnnotate === undefined ? {} : { onAnnotate })}
              onError={report}
              onRemove={() => {
                if (draftToken !== undefined)
                  void run(() =>
                    window.promptly.removeDraftAttachment({ draftToken, id: attachment.id })
                  );
              }}
            />
          ))}
        </div>
      )}
      {editable && (
        <div className="attachment-intake">
          <Button
            variant="outline"
            size="sm"
            disabled={pending || busy || draftToken === undefined}
            onClick={() => {
              if (draftToken !== undefined)
                void run(() => window.promptly.chooseAttachments({ draftToken }));
            }}
          >
            <Paperclip aria-hidden="true" />
            Add files
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending || busy || draftToken === undefined}
            data-paste-attachment
            onClick={paste}
          >
            <ClipboardPaste aria-hidden="true" />
            Paste attachment
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending || busy || onDraw === undefined}
            onClick={onDraw}
          >
            <Pencil aria-hidden="true" />
            Draw
          </Button>
          <span className="attachment-limit">{String(attachments.length)} of 8 · 10 MB each</span>
        </div>
      )}
      {drag && <p className="attachment-drop-notice">Drop to attach</p>}
      {message !== undefined && (
        <p role="alert" className="attachment-error">
          {message}
        </p>
      )}
    </section>
  );
}
