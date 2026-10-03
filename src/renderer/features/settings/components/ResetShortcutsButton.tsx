import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { defaultLocalShortcuts } from '../../../../shared/contracts/local-shortcuts';
import type { SettingsPatch } from '../../../../shared/contracts/settings';
import { defaultShortcutSettings } from '../../../../shared/shortcuts/defaults';
import { Button } from '../../../components/ui/button';

export function ResetShortcutsButton({
  disabled,
  apply,
  localOnly = false
}: {
  disabled: boolean;
  apply: (patch: SettingsPatch) => Promise<void>;
  localOnly?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'pending' | 'complete'>('idle');
  const reset = async () => {
    setState('pending');
    try {
      await apply(
        localOnly ? { localShortcuts: defaultLocalShortcuts() } : defaultShortcutSettings()
      );
      setState('complete');
    } catch {
      // The shared shortcut preferences owner displays the authoritative failure.
      setState('idle');
    }
  };

  return (
    <div className="shortcut-reset">
      <Button
        type="button"
        variant={localOnly ? 'ghost' : 'outline'}
        size="sm"
        disabled={disabled || state === 'pending'}
        aria-busy={state === 'pending'}
        aria-label={localOnly ? 'Reset in-app shortcuts' : 'Reset all shortcuts'}
        onClick={() => {
          void reset();
        }}
      >
        <RotateCcw aria-hidden="true" />
        {state === 'pending' ? 'Resetting' : localOnly ? 'Reset' : 'Reset all'}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === 'complete' ? 'Shortcut preferences reset.' : ''}
      </span>
    </div>
  );
}
