import { Check } from 'lucide-react';

export function LibraryCopyToastContent() {
  return (
    <div className="library-copy-toast" role="status" aria-live="polite">
      <Check aria-hidden="true" size={16} />
      <strong>Copied</strong>
      <button
        type="button"
        aria-label="Open Promptly"
        onClick={() => {
          void window.promptly.setWindowVisibility({ visible: true });
        }}
      >
        Open Promptly
      </button>
    </div>
  );
}
