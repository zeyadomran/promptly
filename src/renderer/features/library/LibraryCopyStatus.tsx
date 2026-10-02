import { Check, CornerDownLeft } from 'lucide-react';

export function LibraryCopyStatus({ copied }: { copied: boolean }) {
  return (
    <span className="library-row-action" aria-live="polite">
      {copied ? <Check className="size-3" /> : <CornerDownLeft className="size-3" />}
      {copied ? 'Copied' : 'Copy'}
    </span>
  );
}
