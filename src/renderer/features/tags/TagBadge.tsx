import { X } from 'lucide-react';

import type { Tag } from '../../../shared/contracts/domain';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { tagColorClasses } from '../../lib/tag-palette';

export function TagBadge({
  name,
  color,
  onRemove,
  disabled = false
}: Pick<Tag, 'name' | 'color'> & { onRemove?: () => void; disabled?: boolean }) {
  return (
    <Badge variant="outline" className="tag-badge">
      <span className={`library-tag-dot ${tagColorClasses[color]}`} aria-hidden="true" />
      <span className="tag-badge-name">{name}</span>
      {onRemove !== undefined && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="tag-badge-remove"
          disabled={disabled}
          aria-label={`Remove ${name}`}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <X aria-hidden="true" size={12} />
        </Button>
      )}
    </Badge>
  );
}
