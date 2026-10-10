import { Button } from '../../components/ui/button';
import { DialogFooter } from '../../components/ui/dialog';
import type { FillModel } from './fill-model';
import type { FillState } from './fill-state';

export function FillValuesActions({
  model,
  state,
  returnLabel,
  confirm
}: {
  model: FillModel;
  state: FillState;
  returnLabel: string | undefined;
  confirm: (returnToApp: boolean) => void;
}) {
  const disabled = state.pending || state.loading || state.prepared === null;

  return (
    <DialogFooter>
      <Button
        variant="ghost"
        disabled={disabled}
        onClick={() => {
          void model.copy(false, true);
        }}
      >
        Copy as written
      </Button>
      <Button
        variant="outline"
        disabled={state.pending}
        onClick={() => {
          model.cancel();
        }}
      >
        Cancel
      </Button>
      <Button
        variant="outline"
        disabled={disabled || returnLabel === undefined}
        aria-disabled={state.unresolved.length > 0 || !state.previewValid}
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
        aria-disabled={state.unresolved.length > 0 || !state.previewValid}
        onClick={() => {
          confirm(false);
        }}
      >
        {state.pending ? 'Copying' : 'Copy'}
      </Button>
    </DialogFooter>
  );
}
