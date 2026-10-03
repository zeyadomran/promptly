import type { TagSummary } from '../../../../shared/contracts/domain';
import { Button } from '../../../components/ui/button';
import { DialogFooter } from '../../../components/ui/dialog';
import { TagDialog, type TagDialogProps } from './TagDialog';

export function TagDeleteDialog({
  tag,
  remove,
  ...dialog
}: TagDialogProps & { tag: TagSummary; remove: () => Promise<void> }) {
  return (
    <TagDialog
      {...dialog}
      title={`Delete “${tag.name}”?`}
      description="This removes the tag from every snippet. Your snippets and their text are kept. This cannot be undone."
    >
      <DialogFooter>
        <Button variant="outline" disabled={dialog.pending} onClick={dialog.close}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={dialog.pending}
          onClick={() => {
            void remove();
          }}
        >
          {dialog.pending ? 'Deleting' : 'Delete tag'}
        </Button>
      </DialogFooter>
    </TagDialog>
  );
}
