import { useState } from 'react';

import type { OnboardingState } from '../../../shared/contracts/onboarding';
import { Button } from '../../components/ui/button';
import { ShortcutRecorder } from '../shortcuts/components/ShortcutRecorder';
import type { useShortcutPreferences } from '../shortcuts/hooks/use-shortcut-preferences';
import type { useShortcutRecording } from '../shortcuts/hooks/use-shortcut-recording';
import { OnboardingShortcutKeys } from './OnboardingShortcutKeys';

export function ShortcutStep({
  state,
  recording,
  preferences,
  pending,
  retry
}: {
  state: OnboardingState;
  recording: ReturnType<typeof useShortcutRecording>;
  preferences: ReturnType<typeof useShortcutPreferences>;
  pending: boolean;
  retry: () => void;
}) {
  const [showRecorder, setShowRecorder] = useState(false);
  const shortcut = preferences.settings.saveShortcut;
  const modifier =
    shortcut.kind === 'double-tap'
      ? ({ shift: 'Shift', control: 'Ctrl', alt: 'Alt', meta: 'Win' } as const)[shortcut.modifier]
      : '';
  const unavailable = ['inactive', 'unavailable'].includes(state.test.status);
  const inactive = pending || preferences.pending || recording.snapshot.phase !== 'idle';

  return (
    <div className="onboarding-step-body onboarding-shortcut-test">
      <h1 tabIndex={-1}>
        {shortcut.kind === 'double-tap'
          ? `Tap ${modifier} twice to test it`
          : 'Press your shortcut to test it'}
      </h1>
      <p className="onboarding-description">
        This is your capture shortcut. Try it now; nothing will be saved.
      </p>
      <OnboardingShortcutKeys shortcut={shortcut} test={state.test} />
      <p className="onboarding-test-status" role="status" aria-live="polite">
        {recording.snapshot.phase !== 'idle'
          ? 'Finish recording to test your shortcut.'
          : state.test.status === 'tap'
            ? `One tap — again within ${String(preferences.settings.doubleTapWindowMs)} ms`
            : unavailable
              ? 'The shortcut test is unavailable. Retry, choose another shortcut, or Skip.'
              : 'Waiting for your shortcut.'}
      </p>
      {unavailable && (
        <Button variant="ghost" disabled={inactive} onClick={retry}>
          Retry test
        </Button>
      )}
      <div className="onboarding-shortcut-options">
        <span>
          Prefer{' '}
          <button
            type="button"
            disabled={inactive}
            onClick={() => {
              void preferences
                .apply({ saveShortcut: { kind: 'double-tap', modifier: 'control' } })
                .catch(() => undefined);
            }}
          >
            Ctrl
          </button>{' '}
          or{' '}
          <button
            type="button"
            disabled={inactive}
            onClick={() => {
              void preferences
                .apply({ saveShortcut: { kind: 'double-tap', modifier: 'alt' } })
                .catch(() => undefined);
            }}
          >
            Alt
          </button>
          ?
        </span>
        <button
          type="button"
          disabled={inactive}
          onClick={() => {
            setShowRecorder(true);
          }}
        >
          Record a combination
        </button>
        {shortcut.kind === 'combination' && (
          <button
            type="button"
            disabled={inactive}
            onClick={() => {
              void preferences
                .apply({ saveShortcut: { kind: 'double-tap', modifier: 'shift' } })
                .catch(() => undefined);
            }}
          >
            Use double-tap Shift
          </button>
        )}
      </div>
      {showRecorder && (
        <ShortcutRecorder
          label="Capture selection"
          value={shortcut.kind === 'combination' ? shortcut.accelerator : null}
          recording={recording}
          disabled={pending || preferences.pending}
          onChange={(accelerator) =>
            accelerator === null
              ? Promise.resolve()
              : preferences.apply({ saveShortcut: { kind: 'combination', accelerator } })
          }
        />
      )}
      {(preferences.error ?? recording.snapshot.error) !== undefined && (
        <p className="onboarding-error" role="alert">
          {preferences.error ?? recording.snapshot.error}
        </p>
      )}
    </div>
  );
}
