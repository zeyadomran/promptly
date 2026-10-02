import { toast } from 'sonner';

import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../components/ui/dialog';

export function OverlayFixture() {
  return (
    <div className="flex flex-wrap gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Open dialog fixture</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accessible overlay fixture</DialogTitle>
            <DialogDescription>
              Tab stays in this dialog. Escape closes it and restores focus.
            </DialogDescription>
          </DialogHeader>
          <Button>Focusable action</Button>
        </DialogContent>
      </Dialog>
      <Button
        onClick={() =>
          toast('Saved to Promptly', {
            description: 'An example toast, with no capture performed.'
          })
        }
      >
        Show toast fixture
      </Button>
      <Button disabled>Disabled action</Button>
      <Button variant="destructive">Destructive state</Button>
    </div>
  );
}
