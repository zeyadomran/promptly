import { File, Image, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { Attachment } from '../../../shared/contracts/attachments';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { attachmentName, attachmentSize } from './attachment-display';
import { AttachmentPreviewDialog } from './AttachmentPreviewDialog';
import { useAttachmentRaster } from './use-attachment-raster';

export function AttachmentChip({
  attachment,
  draftToken,
  editable = false,
  pending = false,
  onRemove,
  onAnnotate,
  onError
}: {
  attachment: Attachment;
  draftToken: string | undefined;
  editable?: boolean;
  pending?: boolean;
  onRemove?: () => void;
  onAnnotate?: (id: string) => void;
  onError: (message: string) => void;
}) {
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [missing, setMissing] = useState(false);
  const image = attachment.kind !== 'file';
  const raster = useAttachmentRaster(attachment.id, draftToken, false, image);
  const name = attachmentName(attachment.name);
  const characters = Array.from(name);
  const tail = characters.length > 32 ? characters.slice(-18).join('') : '';
  const beginning = tail === '' ? name : characters.slice(0, -18).join('');
  const action = async (copy: boolean) => {
    setBusy(true);
    setMessage(undefined);
    try {
      const request = { id: attachment.id, ...(draftToken === undefined ? {} : { draftToken }) };
      const result = copy
        ? await window.promptly.copyAttachmentImage(request)
        : await window.promptly.saveAttachmentCopy(request);

      if (!result.ok) {
        if (result.error.code === 'NOT_FOUND') setMissing(true);
        onError(result.error.message);
      } else
        setMessage(
          result.value.status === 'cancelled'
            ? 'Save canceled.'
            : copy
              ? 'Image copied.'
              : 'Copy saved.'
        );
    } catch {
      onError('Unable to complete the attachment action.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="attachment-chip"
      title={`${name} · ${attachmentSize(attachment.byteLength)}${attachment.width === null ? '' : ` · ${String(attachment.width)} × ${String(attachment.height)}`}`}
    >
      <div className="attachment-thumbnail" aria-hidden="true">
        {raster.url !== undefined ? <img src={raster.url} alt="" /> : image ? <Image /> : <File />}
      </div>
      <div className="attachment-chip-label">
        <span className="attachment-name">
          {raster.missing || missing ? (
            'File missing from storage'
          ) : (
            <>
              <span className="attachment-name-start">{beginning}</span>
              {tail !== '' && <span>{tail}</span>}
            </>
          )}
        </span>
        <span>{attachmentSize(attachment.byteLength)}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Actions for ${name}`}
            disabled={pending || busy}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!raster.missing && !missing && (
            <>
              {image && (
                <DropdownMenuItem
                  onSelect={() => {
                    setPreview(true);
                  }}
                >
                  Preview
                </DropdownMenuItem>
              )}
              {image && (
                <DropdownMenuItem
                  onSelect={() => {
                    void action(true);
                  }}
                >
                  Copy image
                </DropdownMenuItem>
              )}
              {image && onAnnotate !== undefined && (
                <DropdownMenuItem
                  disabled={pending}
                  onSelect={() => {
                    onAnnotate(attachment.id);
                  }}
                >
                  <Pencil aria-hidden="true" />
                  {attachment.kind === 'drawing' ? 'Edit drawing' : 'Annotate'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onSelect={() => {
                  void action(false);
                }}
              >
                Save a copy…
              </DropdownMenuItem>
            </>
          )}
          {editable && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onRemove?.()}>
                <Trash2 aria-hidden="true" />
                Remove
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {message !== undefined && (
        <span className="sr-only" role="status">
          {message}
        </span>
      )}
      {image && (
        <AttachmentPreviewDialog
          attachment={attachment}
          draftToken={draftToken}
          open={preview}
          onOpenChange={setPreview}
        />
      )}
    </div>
  );
}
