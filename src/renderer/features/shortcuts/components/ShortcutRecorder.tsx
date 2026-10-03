import { X } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useId, useState } from 'react';

import type { ShortcutCollision, ShortcutEdit } from '../../../../shared/shortcuts/shortcut-edit';
import { Button } from '../../../components/ui/button';
import type { useShortcutRecording } from '../hooks/use-shortcut-recording';
import { ShortcutRecorderContent } from './ShortcutRecorderContent';
import { ShortcutSwapChoice } from './ShortcutSwapChoice';

export interface ShortcutRecorderProps extends Pick<
  ComponentProps<'button'>,
  'id' | 'aria-labelledby' | 'aria-describedby' | 'disabled'
> {
  label: string;
  value: string | null;
  optional?: boolean;
  scope?: 'global' | 'local';
  recording: ReturnType<typeof useShortcutRecording>;
  onChange: (accelerator: string | null) => Promise<void>;
  inspect?: (accelerator: string) => ShortcutEdit;
  onSwap?: (accelerator: string, collision: ShortcutCollision) => Promise<void>;
}

export function ShortcutRecorder({
  label,
  value,
  optional = false,
  scope = 'global',
  recording,
  onChange,
  inspect,
  onSwap,
  ...props
}: ShortcutRecorderProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const { session, snapshot } = recording;
  const mine = snapshot.target === id;
  const active = mine && (snapshot.phase === 'starting' || snapshot.phase === 'recording');
  const collision = mine ? snapshot.collision : undefined;
  const [clearError, setClearError] = useState<string>();
  const [clearing, setClearing] = useState(false);
  const error = (mine ? snapshot.error : undefined) ?? clearError;
  const disabled = props.disabled === true || clearing || snapshot.phase === 'saving';
  const hintId = `${id}-hint`;
  const candidate = mine ? snapshot.candidate : undefined;

  return (
    <div
      className="shortcut-recorder-group"
      data-scope={scope}
      data-conflict={collision !== undefined}
    >
      <div className="shortcut-recorder-controls">
        {active && (
          <span id={hintId} className="shortcut-recording-hint">
            {candidate !== undefined
              ? 'Release keys'
              : scope === 'local'
                ? 'Esc records · Tab leaves'
                : 'Esc cancels · Tab leaves'}
          </span>
        )}
        <Button
          {...props}
          id={id}
          type="button"
          variant="outline"
          disabled={disabled && !(mine && snapshot.phase === 'saving')}
          aria-disabled={disabled}
          className="shortcut-recorder"
          data-recording={active}
          data-conflict={collision !== undefined}
          data-empty={value === null}
          data-scope={scope}
          aria-label={`Record ${label}`}
          aria-describedby={
            [props['aria-describedby'], active ? hintId : undefined].filter(Boolean).join(' ') ||
            undefined
          }
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
            else void session.start(id, onChange, scope, inspect);
          }}
        >
          <ShortcutRecorderContent
            value={value}
            candidate={candidate}
            preview={mine ? snapshot.preview : undefined}
            active={active}
            phase={mine ? snapshot.phase : 'idle'}
          />
        </Button>
        {active && scope === 'local' && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              void session.cancel();
            }}
          >
            Cancel
          </Button>
        )}
        {optional && value !== null && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
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
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
      {collision !== undefined && candidate !== undefined && (
        <ShortcutSwapChoice
          collision={collision}
          disabled={snapshot.phase !== 'conflict' || disabled}
          onCancel={() => {
            void session.cancel();
          }}
          onSwap={() => {
            if (onSwap !== undefined)
              void session.resolveConflict(() => onSwap(candidate, collision));
          }}
        />
      )}
      {error !== undefined && (
        <p className="settings-row-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
