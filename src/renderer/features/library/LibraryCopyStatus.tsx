import { Check, CornerDownLeft } from 'lucide-react';

export function LibraryCopyStatus({ copied }: { copied: boolean }) {
  return (
    <span className="library-row-action" aria-live="polite">
      {copied ? (
        <>
          <Check className="size-3" aria-hidden="true" />
          Copied
        </>
      ) : (
        <>
          <CornerDownLeft className="size-3" aria-hidden="true" />
          <span className="sr-only">Press Enter to copy</span>
        </>
      )}
    </span>
  );
}
