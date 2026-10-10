import { Button } from '../../components/ui/button';
import { DialogFooter } from '../../components/ui/dialog';
import type { FillState } from '../variables/fill-state';

export function BundleReviewActions({
  filling,
  selectionPending,
  canCopy,
  returnLabel,
  back,
  confirm
}: {
  filling: FillState;
  selectionPending: boolean;
  canCopy: boolean;
  returnLabel: string | undefined;
  back: () => void;
  confirm: (returnToApp: boolean) => void;
}) {
  const disabled =
    filling.pending || filling.loading || selectionPending || !canCopy || filling.prepared === null;

  return (
    <DialogFooter className="workflow-actions">
      <Button variant="outline" disabled={filling.pending} onClick={back}>
        Back
      </Button>
      <Button
        variant="outline"
        disabled={disabled || returnLabel === undefined}
        aria-disabled={filling.unresolved.length > 0 || !filling.previewValid}
        title={
          returnLabel === undefined
            ? 'No previous app to return to.'
            : `Copy, then switch back to ${returnLabel}. Paste it yourself.`
        }
        onClick={() => {
          confirm(true);
        }}
      >
        Copy and return
      </Button>
      <Button
        disabled={disabled}
        aria-disabled={filling.unresolved.length > 0 || !filling.previewValid}
        onClick={() => {
          confirm(false);
        }}
      >
        {filling.pending ? 'Copying' : 'Copy bundle'}
      </Button>
    </DialogFooter>
  );
}
