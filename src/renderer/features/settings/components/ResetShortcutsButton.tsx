import { useState } from 'react';

import type { SettingsPatch } from '../../../../shared/contracts/settings';
import { defaultShortcutSettings } from '../../../../shared/shortcuts/defaults';
import { Button } from '../../../components/ui/button';
import { SettingsRow } from './SettingsRow';

export function ResetShortcutsButton({
  disabled,
  apply
}: {
  disabled: boolean;
  apply: (patch: SettingsPatch) => Promise<void>;
}) {
  const [state, setState] = useState<'idle' | 'pending' | 'complete'>('idle');
  const reset = async () => {
    setState('pending');
    try {
      await apply(defaultShortcutSettings());
      setState('complete');
    } catch {
      // The shared shortcut preferences owner displays the authoritative failure.
      setState('idle');
    }
  };

  return (
    <SettingsRow
      label="Restore shortcut defaults"
      description="Reset global and in-app shortcuts, including double-tap timing."
      disabled={disabled || state === 'pending'}
    >
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || state === 'pending'}
          aria-busy={state === 'pending'}
          onClick={() => {
            void reset();
          }}
        >
          Reset shortcuts
        </Button>
        <p className="shortcut-hint" role="status" aria-live="polite">
          {state === 'pending'
            ? 'Resetting shortcuts…'
            : state === 'complete'
              ? 'Shortcut preferences reset.'
              : ''}
        </p>
      </div>
    </SettingsRow>
  );
}
