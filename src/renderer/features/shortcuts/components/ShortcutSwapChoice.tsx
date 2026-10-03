import { TriangleAlert } from 'lucide-react';

import type { ShortcutCollision } from '../../../../shared/shortcuts/shortcut-edit';
import { Button } from '../../../components/ui/button';

export function ShortcutSwapChoice({
  collision,
  disabled,
  onSwap,
  onCancel
}: {
  collision: ShortcutCollision;
  disabled: boolean;
  onSwap: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="shortcut-swap-choice" role="status">
      <span className="shortcut-swap-message">
        <TriangleAlert aria-hidden="true" />
        Already used by {collision.label}
      </span>
      {collision.swapAllowed ? (
        <Button type="button" variant="outline" size="xs" disabled={disabled} onClick={onSwap}>
          Swap
        </Button>
      ) : (
        <span className="shortcut-swap-reason">{collision.reason}</span>
      )}
      <Button type="button" variant="outline" size="xs" disabled={disabled} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
