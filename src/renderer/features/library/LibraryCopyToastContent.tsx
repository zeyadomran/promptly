import { Check } from 'lucide-react';

export function LibraryCopyToastContent() {
  return (
    <div className="library-copy-toast" role="status" aria-live="polite">
      <Check aria-hidden="true" size={16} />
      <strong>Copied</strong>
    </div>
  );
}
