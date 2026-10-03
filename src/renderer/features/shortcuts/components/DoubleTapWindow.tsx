import { useState } from 'react';

import { Slider } from '../../../components/ui/slider';

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
    <div className="shortcut-timing-row">
      <span className="shortcut-control-label">Window</span>
      <Slider
        aria-label="Double-tap window"
        min={150}
        max={600}
        step={10}
        disabled={disabled}
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
      <output aria-live="polite">
        {draft ?? value} ms<span> window</span>
      </output>
    </div>
  );
}
