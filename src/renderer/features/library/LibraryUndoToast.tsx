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
      <span>Snippet deleted</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          dismiss();
          void undo();
        }}
      >
        Undo
      </Button>
      <Button variant="ghost" size="sm" aria-label="Dismiss notification" onClick={dismiss}>
        ×
      </Button>
    </div>
  );
}
