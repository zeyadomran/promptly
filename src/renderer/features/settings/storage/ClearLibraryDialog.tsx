import { useState } from 'react';

import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

interface ClearLibraryProps {
  pending: boolean;
  error: string | undefined;
  clear: () => Promise<boolean>;
}

export function ClearLibraryDialog({ pending, error, clear }: ClearLibraryProps) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const apply = async () => {
    if (confirmation === 'CLEAR ALL' && (await clear())) setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) {
          setOpen(next);
          setConfirmation('');
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" disabled={pending}>
          Clear all
        </Button>
      </DialogTrigger>
      <DialogContent
        className="storage-clear-dialog"
        showCloseButton={!pending}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Clear all Promptly data?</DialogTitle>
          <DialogDescription>
            This permanently removes Library snippets, queued prompts, tags, attachment files,
            unsaved drafts and items you could undo. Preferences are kept.
          </DialogDescription>
        </DialogHeader>
        <div className="storage-confirmation">
          <Label htmlFor="clear-library-confirmation">
            Type <span className="font-mono">CLEAR ALL</span> to confirm
          </Label>
          <Input
            id="clear-library-confirmation"
            autoComplete="off"
            value={confirmation}
            disabled={pending}
            onChange={(event) => {
              setConfirmation(event.target.value);
            }}
          />
        </div>
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
              setOpen(false);
              setConfirmation('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending || confirmation !== 'CLEAR ALL'}
            onClick={() => {
              void apply();
            }}
          >
            {pending ? 'Clearing' : 'Clear all data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
