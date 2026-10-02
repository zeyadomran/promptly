import { useId, useState } from 'react';

import type { Settings } from '../../../../shared/contracts/settings';
import type { Modifier } from '../../../../shared/contracts/shortcuts';
import { shortcutKeycaps } from '../../../../shared/shortcuts/accelerator';
import { ShortcutKey } from '../../../components/shared/ShortcutKey';
import { Button } from '../../../components/ui/button';
import type { useShortcutRecording } from '../hooks/use-shortcut-recording';
import { ModifierSelector } from './ModifierSelector';
import { ShortcutRecorder } from './ShortcutRecorder';

/** Choosing combination mode starts recording; it never invents or erases a saved binding. */
export function CaptureShortcutMode({
  value,
  recording,
  disabled,
  onChange
}: {
  value: Settings['saveShortcut'];
  recording: ReturnType<typeof useShortcutRecording>;
  disabled: boolean;
  onChange: (shortcut: Settings['saveShortcut']) => Promise<void>;
}) {
  const modifierId = useId();
  const [modifier, setModifier] = useState<Modifier>(
    value.kind === 'double-tap' ? value.modifier : 'shift'
  );
  const currentModifier = value.kind === 'double-tap' ? value.modifier : modifier;
  const inactive = disabled || recording.snapshot.phase !== 'idle';

  return (
    <fieldset className="capture-shortcut-mode" aria-disabled={disabled}>
      <legend>Save selection</legend>
      <div className="shortcut-modes">
        <div className="shortcut-mode" data-selected={value.kind === 'double-tap'}>
          <Button
            type="button"
            variant="ghost"
            aria-pressed={value.kind === 'double-tap'}
            disabled={inactive}
            onClick={() => {
              void onChange({ kind: 'double-tap', modifier: currentModifier }).catch(
                () => undefined
              );
            }}
          >
            <ShortcutKey>
              {shortcutKeycaps(`${currentModifier}+Space`, window.promptly.platform)[0]}
            </ShortcutKey>
            Double-tap a modifier
          </Button>
          <span className="shortcut-hint">Recommended · Two completed taps</span>
          <label htmlFor={modifierId}>Modifier</label>
          <ModifierSelector
            id={modifierId}
            platform={window.promptly.platform}
            value={currentModifier}
            disabled={inactive}
            onChange={(next) => {
              if (value.kind === 'double-tap')
                void onChange({ kind: 'double-tap', modifier: next })
                  .then(() => {
                    setModifier(next);
                  })
                  .catch(() => undefined);
              else setModifier(next);
            }}
          />
        </div>
        <div className="shortcut-mode" data-selected={value.kind === 'combination'}>
          <span className="shortcut-mode-title">Key combination</span>
          <ShortcutRecorder
            label="Save selection"
            value={value.kind === 'combination' ? value.accelerator : null}
            recording={recording}
            disabled={disabled}
            onChange={(accelerator) =>
              accelerator === null
                ? Promise.resolve()
                : onChange({ kind: 'combination', accelerator })
            }
          />
          <p className="shortcut-hint">
            Your current shortcut stays active until a replacement is accepted.
          </p>
        </div>
      </div>
    </fieldset>
  );
}
