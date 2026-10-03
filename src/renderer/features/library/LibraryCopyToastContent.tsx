import { Check } from 'lucide-react';

export function LibraryCopyToastContent({ preview }: { preview: string | undefined }) {
  return (
    <div className="library-copy-toast" role="status" aria-live="polite">
      <Check aria-hidden="true" size={16} />
      <strong>Copied</strong>
      {preview !== undefined && (
        <span className="library-copy-preview">{preview.replace(/\s+/gu, ' ').trim()}</span>
      )}
    </div>
  );
}
