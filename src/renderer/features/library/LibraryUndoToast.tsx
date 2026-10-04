import { Trash2, Undo2, X } from 'lucide-react';

import { Button } from '../../components/ui/button';

export function LibraryUndoToast({
  undo,
  dismiss
}: {
  undo: () => Promise<void>;
  dismiss: () => void;
}) {
  return (
    <div className="library-undo-toast" role="status">
      <Trash2 aria-hidden="true" size={16} />
      <span>Snippet deleted</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          dismiss();
          void undo();
        }}
      >
        <Undo2 aria-hidden="true" size={14} />
        Undo
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="Dismiss notification" onClick={dismiss}>
        <X aria-hidden="true" size={14} />
      </Button>
    </div>
  );
}
