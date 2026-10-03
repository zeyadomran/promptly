import { Check } from 'lucide-react';

export function LibraryCopyStatus() {
  return (
    <span className="library-row-action" aria-live="polite">
      <Check className="size-3" aria-hidden="true" />
      Copied
    </span>
  );
}
