import type { ComponentProps } from 'react';
import { useId, useState } from 'react';

import { shortcutLabel } from '../../../../shared/shortcuts/accelerator';
import { Button } from '../../../components/ui/button';
import type { useShortcutRecording } from '../hooks/use-shortcut-recording';
import { ShortcutKeycaps } from './ShortcutKeycaps';

type ShortcutRecorderProps = Pick<
  ComponentProps<'button'>,
  'id' | 'aria-labelledby' | 'aria-describedby' | 'disabled'
> & {
  label: string;
  value: string | null;
  optional?: boolean;
  recording: ReturnType<typeof useShortcutRecording>;
  onChange: (accelerator: string | null) => Promise<void>;
};

export function ShortcutRecorder({
  label,
  value,
  optional = false,
  recording,
  onChange,
  ...props
}: ShortcutRecorderProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const { session, snapshot } = recording;
  const mine = snapshot.target === id;
  const active = mine && (snapshot.phase === 'starting' || snapshot.phase === 'recording');
  const [clearError, setClearError] = useState<string>();
  const [clearing, setClearing] = useState(false);
  const error = (mine ? snapshot.error : undefined) ?? clearError;
  const disabled = props.disabled === true || clearing || snapshot.phase === 'saving';
  const hintId = `${id}-hint`;

  return (
    <div className="shortcut-recorder-group">
      <div className="shortcut-recorder-controls">
        <Button
          {...props}
          id={id}
          type="button"
          variant="outline"
          disabled={disabled && !(mine && snapshot.phase === 'saving')}
          aria-disabled={disabled}
          className="shortcut-recorder"
          data-recording={active}
          aria-label={`Record ${label}`}
          aria-describedby={[props['aria-describedby'], hintId].filter(Boolean).join(' ')}
          aria-pressed={active}
          onBlur={() => {
            if (
              session.snapshot.target === id &&
              ['starting', 'recording'].includes(session.snapshot.phase)
            )
              void session.cancel();
          }}
          onClick={() => {
            if (disabled) return;
            setClearError(undefined);
            if (active) void session.cancel();
            else void session.start(id, onChange);
          }}
        >
          {active ? (
            snapshot.candidate === undefined ? (
              <span role="status">
                {snapshot.phase === 'starting' ? 'Starting' : 'Press a key'}
              </span>
            ) : (
              <ShortcutKeycaps
                accelerator={snapshot.candidate}
                platform={window.promptly.platform}
              />
            )
          ) : mine && snapshot.phase === 'saving' ? (
            'Applying'
          ) : value === null ? (
            'Click to record'
          ) : (
            <ShortcutKeycaps accelerator={value} platform={window.promptly.platform} />
          )}
        </Button>
        {optional && value !== null && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Clear ${label}`}
            disabled={disabled || snapshot.phase !== 'idle'}
            onClick={() => {
              setClearing(true);
              setClearError(undefined);
              void onChange(null)
                .catch((caught: unknown) => {
                  setClearError(
                    caught instanceof Error ? caught.message : 'Unable to clear this shortcut.'
                  );
                })
                .finally(() => {
                  setClearing(false);
                });
            }}
          >
            Clear
          </Button>
        )}
      </div>
      <p id={hintId} className="shortcut-hint">
        {active
          ? snapshot.candidate === undefined
            ? 'Escape cancels. Tab leaves recording.'
            : 'Release the keys to apply. Escape cancels.'
          : `${value === null ? 'No binding. ' : `Current binding: ${shortcutLabel(value, window.promptly.platform)}. `}Click the shortcut, or focus it and press Enter or Space, to change it.`}
      </p>
      {error !== undefined && (
        <p className="settings-row-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
