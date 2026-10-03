import { useEffect, useRef } from 'react';

import { Button } from '../../../components/ui/button';
import { useUpdates } from '../hooks/use-updates';
import { StorageRow } from '../storage/StorageRow';

export function UpdateSettings() {
  const { state, error, act } = useUpdates();
  const button = useRef<HTMLButtonElement>(null);
  const status = state?.status;

  useEffect(() => {
    if ((state?.focusRequest ?? 0) === 0) return;
    button.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
    button.current?.focus({ preventScroll: true });
  }, [state?.focusRequest]);

  const label =
    status === 'available'
      ? 'Update'
      : status === 'ready'
        ? 'Restart now'
        : status === 'checking'
          ? 'Checking…'
          : status === 'updating'
            ? 'Updating…'
            : 'Check for updates';

  return (
    <div>
      <StorageRow
        label="Updates"
        description="Checks automatically when Promptly starts. You choose when to update."
      >
        <Button
          ref={button}
          variant="outline"
          aria-describedby="update-status"
          disabled={
            state === undefined ||
            status === 'checking' ||
            status === 'updating' ||
            status === 'unavailable'
          }
          onClick={() => {
            void act();
          }}
        >
          {label}
        </Button>
      </StorageRow>
      <p
        id="update-status"
        className="text-muted-foreground text-sm"
        role="status"
        aria-live="polite"
      >
        {error ?? state?.message ?? 'Reading update status…'}
      </p>
    </div>
  );
}
