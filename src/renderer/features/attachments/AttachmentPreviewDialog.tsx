import type { Attachment } from '../../../shared/contracts/attachments';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../../components/ui/dialog';
import { attachmentName } from './attachment-display';
import { useAttachmentRaster } from './use-attachment-raster';

export function AttachmentPreviewDialog({
  attachment,
  draftToken,
  open,
  onOpenChange
}: {
  attachment: Attachment;
  draftToken: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const image = useAttachmentRaster(attachment.id, draftToken, true, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="attachment-preview-dialog">
        <DialogHeader>
          <DialogTitle>{attachmentName(attachment.name)}</DialogTitle>
          <DialogDescription>Image preview. The original stays in Promptly.</DialogDescription>
        </DialogHeader>
        {image.url !== undefined ? (
          <img
            className="attachment-full-preview"
            src={image.url}
            alt={attachmentName(attachment.name)}
          />
        ) : (
          <p role={image.error === undefined ? 'status' : 'alert'}>
            {image.error ?? 'Loading preview…'}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
