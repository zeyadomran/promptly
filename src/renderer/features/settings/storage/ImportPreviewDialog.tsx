import type { ImportPreview } from '../../../../shared/contracts/backup/operations';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../../components/ui/dialog';

interface ImportPreviewProps {
  preview: ImportPreview | undefined;
  pending: boolean;
  error: string | undefined;
  cancel: () => Promise<void>;
  confirm: () => Promise<void>;
  restoreFocus: () => void;
}

export function ImportPreviewDialog({
  preview,
  pending,
  error,
  cancel,
  confirm,
  restoreFocus
}: ImportPreviewProps) {
  return (
    <Dialog
      open={preview !== undefined}
      onOpenChange={(open) => {
        if (!open && !pending) void cancel();
      }}
    >
      <DialogContent
        className="storage-import-dialog"
        showCloseButton={!pending}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Import library</DialogTitle>
          <DialogDescription>
            Review this backup before adding Library, Queue and attachments. Existing content is
            kept.
          </DialogDescription>
        </DialogHeader>
        <div className="storage-preview-body">
          {preview !== undefined && (
            <dl className="storage-preview">
              <dt>Snippets</dt>
              <dd>{preview.snippets}</dd>
              <dt>Queued prompts</dt>
              <dd>{preview.queueItems ?? 0}</dd>
              <dt>Attachment files</dt>
              <dd>{preview.assets ?? 0}</dd>
              <dt>Tag definitions</dt>
              <dd>{preview.tags}</dd>
              <dt>Tag memberships</dt>
              <dd>{preview.memberships}</dd>
              <dt>Snippet IDs remapped</dt>
              <dd>{preview.remappedSnippetIds}</dd>
              <dt>Tag IDs remapped</dt>
              <dd>{preview.remappedTagIds}</dd>
              <dt>Queue IDs remapped</dt>
              <dd>{preview.remappedQueueIds ?? 0}</dd>
              <dt>Attachment IDs remapped</dt>
              <dd>{preview.remappedAssetIds ?? 0}</dd>
              <dt>Tags combined by name</dt>
              <dd>{preview.coalescedTags}</dd>
              <dt>Already present snippets</dt>
              <dd>{preview.skippedSnippets}</dd>
              <dt>Already present queued prompts</dt>
              <dd>{preview.skippedQueueItems ?? 0}</dd>
              <dt>Already present attachment files</dt>
              <dd>{preview.skippedAssets ?? 0}</dd>
            </dl>
          )}
          <p className="storage-note">
            Identical versions are skipped. Different IDs and conflicting versions are preserved.
            Matching tag names share the existing tag.
          </p>
          {error !== undefined && (
            <p className="settings-row-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              void cancel();
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              void confirm();
            }}
          >
            {pending ? 'Importing' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
