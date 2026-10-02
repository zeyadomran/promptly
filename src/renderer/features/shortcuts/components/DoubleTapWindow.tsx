import { useState } from 'react';

import { Slider } from '../../../components/ui/slider';
import { SettingsRow } from '../../settings/components/SettingsRow';

export function DoubleTapWindow({
  value,
  disabled,
  onChange
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState<number>();

  return (
    <SettingsRow
      label="Double-tap window"
      description={`${String(draft ?? value)} ms · 150–600 ms between taps`}
      disabled={disabled}
    >
      <Slider
        min={150}
        max={600}
        step={10}
        value={[draft ?? value]}
        onValueChange={([next]) => {
          if (next !== undefined) setDraft(next);
        }}
        onValueCommit={([next]) => {
          if (next !== undefined)
            void onChange(next)
              .catch(() => undefined)
              .finally(() => {
                setDraft(undefined);
              });
        }}
      />
    </SettingsRow>
  );
}
