import { useId, useState } from 'react';

import type { Settings } from '../../../../shared/contracts/settings';
import type { Modifier } from '../../../../shared/contracts/shortcuts';
import type { ShortcutCollision, ShortcutEdit } from '../../../../shared/shortcuts/shortcut-edit';
import { ToggleGroup, ToggleGroupItem } from '../../../components/ui/toggle-group';
import type { useShortcutRecording } from '../hooks/use-shortcut-recording';
import { DoubleTapKeycaps } from './DoubleTapKeycaps';
import { DoubleTapWindow } from './DoubleTapWindow';
import { ModifierSelector } from './ModifierSelector';
import { ShortcutRecorder } from './ShortcutRecorder';

/** Mode selection never invents a combination or removes a saved binding. */
export function CaptureShortcutMode({
  value,
  recording,
  disabled,
  onChange,
  inspect,
  onSwap,
  tapWindow
}: {
  value: Settings['saveShortcut'];
  recording: ReturnType<typeof useShortcutRecording>;
  disabled: boolean;
  onChange: (shortcut: Settings['saveShortcut']) => Promise<void>;
  inspect?: (accelerator: string) => ShortcutEdit;
  onSwap?: (accelerator: string, collision: ShortcutCollision) => Promise<void>;
  tapWindow?: { value: number; onChange: (value: number) => Promise<void> };
}) {
  const recorderId = useId();
  const [requestedCombination, setRequestedCombination] = useState(false);
  const [modifier, setModifier] = useState<Modifier>(
    value.kind === 'double-tap' ? value.modifier : 'shift'
  );
  const currentModifier = value.kind === 'double-tap' ? value.modifier : modifier;
  const mode = value.kind === 'combination' || requestedCombination ? 'combination' : 'double-tap';
  const inactive = disabled || recording.snapshot.phase !== 'idle';
  const commit = (accelerator: string | null) =>
    accelerator === null ? Promise.resolve() : onChange({ kind: 'combination', accelerator });

  return (
    <fieldset className="capture-shortcut-mode" aria-disabled={disabled}>
      <legend>Capture selection</legend>
      <div className="shortcut-capture-label">
        <span>Capture selection</span>
        <p>Saves the text you’ve selected in another app.</p>
      </div>
      <div className="shortcut-capture-controls">
        <ToggleGroup
          type="single"
          value={mode}
          aria-label="Capture shortcut mode"
          className="shortcut-mode-toggle"
          disabled={inactive}
          onValueChange={(next) => {
            if (next === 'double-tap') {
              void onChange({ kind: 'double-tap', modifier: currentModifier })
                .then(() => {
                  setRequestedCombination(false);
                })
                .catch(() => undefined);
            } else if (next === 'combination') {
              setRequestedCombination(true);
              void recording.session.start(recorderId, commit, 'global', inspect);
            }
          }}
        >
          <ToggleGroupItem value="double-tap">Double-tap</ToggleGroupItem>
          <ToggleGroupItem value="combination">Key combination</ToggleGroupItem>
        </ToggleGroup>
        {mode === 'double-tap' ? (
          <>
            <div className="shortcut-modifier-row">
              <span className="shortcut-control-label">Modifier</span>
              <ModifierSelector
                value={currentModifier}
                disabled={inactive}
                onChange={(next) => {
                  void onChange({ kind: 'double-tap', modifier: next })
                    .then(() => {
                      setModifier(next);
                    })
                    .catch(() => undefined);
                }}
              />
              <DoubleTapKeycaps modifier={currentModifier} />
            </div>
            {tapWindow !== undefined && (
              <DoubleTapWindow
                value={tapWindow.value}
                disabled={inactive}
                onChange={tapWindow.onChange}
              />
            )}
          </>
        ) : (
          <ShortcutRecorder
            id={recorderId}
            label="Capture selection"
            value={value.kind === 'combination' ? value.accelerator : null}
            recording={recording}
            disabled={disabled}
            onChange={commit}
            {...(inspect === undefined ? {} : { inspect })}
            {...(onSwap === undefined ? {} : { onSwap })}
          />
        )}
      </div>
    </fieldset>
  );
}
