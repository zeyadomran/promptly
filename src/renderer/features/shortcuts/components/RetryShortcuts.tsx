import { useState } from 'react';

import type { ShortcutStatus } from '../../../../shared/contracts/shortcuts';
import { Button } from '../../../components/ui/button';

export function RetryShortcuts({
  status,
  disabled
}: {
  status: ShortcutStatus | undefined;
  disabled: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const unavailable =
    status?.capture === 'unavailable' ||
    status?.open === 'unavailable' ||
    status?.pin === 'unavailable' ||
    status?.compose === 'unavailable';
  const retry = async () => {
    setPending(true);
    try {
      const result = await window.promptly.retryShortcuts({});

      setMessage(
        !result.ok
          ? result.error.message
          : result.value.capture === 'unavailable' ||
              result.value.open === 'unavailable' ||
              result.value.pin === 'unavailable' ||
              result.value.compose === 'unavailable'
            ? 'Some shortcuts remain unavailable. Choose another combination or restart Promptly if the modifier listener is unavailable.'
            : 'Retry completed. See the current shortcut status above.'
      );
    } catch {
      setMessage('Shortcut status could not be verified.');
    } finally {
      setPending(false);
    }
  };

  if (!unavailable && message === undefined) return null;
  return (
    <div className="shortcut-system-warning">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={
          disabled ||
          pending ||
          status?.recording === true ||
          status?.hook === 'suspended' ||
          status?.quarantined === true
        }
        onClick={() => {
          void retry();
        }}
      >
        {pending ? 'Retrying' : 'Retry unavailable shortcuts'}
      </Button>
      <p role="status">
        {message ??
          'Retry the current global bindings after freeing a conflicting shortcut. Your preferences stay unchanged.'}
      </p>
    </div>
  );
}
