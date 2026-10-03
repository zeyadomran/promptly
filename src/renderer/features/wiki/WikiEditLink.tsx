import { ExternalLink } from 'lucide-react';

export function WikiEditLink({ onEdit, disabled }: { onEdit: () => void; disabled: boolean }) {
  return (
    <button className="wiki-edit-link" onClick={onEdit} disabled={disabled}>
      Edit on GitHub <ExternalLink aria-hidden="true" />
    </button>
  );
}
