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
            Review this backup before adding it to your library. Existing snippets are kept.
          </DialogDescription>
        </DialogHeader>
        {preview !== undefined && (
          <dl className="storage-preview">
            <dt>Snippets</dt>
            <dd>{preview.snippets}</dd>
            <dt>Tag definitions</dt>
            <dd>{preview.tags}</dd>
            <dt>Tag memberships</dt>
            <dd>{preview.memberships}</dd>
            <dt>Snippet IDs remapped</dt>
            <dd>{preview.remappedSnippetIds}</dd>
            <dt>Tag IDs remapped</dt>
            <dd>{preview.remappedTagIds}</dd>
            <dt>Tags combined by name</dt>
            <dd>{preview.coalescedTags}</dd>
            <dt>Already present snippets</dt>
            <dd>{preview.skippedSnippets}</dd>
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
