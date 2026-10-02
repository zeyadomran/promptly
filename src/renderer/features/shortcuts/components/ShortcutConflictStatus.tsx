import type { ShortcutStatus } from '../../../../shared/contracts/shortcuts';

export function ShortcutConflictStatus({
  status,
  error
}: {
  status: ShortcutStatus | undefined;
  error: string | undefined;
}) {
  return (
    <div className="shortcut-conflict-status" role="status" aria-live="polite">
      {error !== undefined && <p className="settings-row-error">{error}</p>}
      {status === undefined ? (
        <p>Checking shortcut registration…</p>
      ) : status.quarantined ? (
        <p className="settings-row-error">Shortcut recovery requires restarting Promptly.</p>
      ) : status.recording ? (
        <p>Global shortcuts are suppressed while recording.</p>
      ) : (
        <>
          <p>
            Save selection:{' '}
            {status.capture === 'registered' ? 'listener available' : 'listener unavailable'}. Open
            Promptly: {status.open === 'registered' ? 'registered' : 'registration unavailable'}.{' '}
            Always on top:{' '}
            {status.pin === 'disabled'
              ? 'no binding'
              : status.pin === 'registered'
                ? 'registered'
                : 'registration unavailable'}
            .
          </p>
          {status.capturePaused && <p>Selection capture is paused.</p>}
          {!status.captureHandlerAvailable && <p>Selection saving is not available yet.</p>}
        </>
      )}
      <p>
        Checks cover known reserved bindings and OS registration. Other apps and every system
        shortcut cannot be scanned; registration alone does not verify delivery.
      </p>
    </div>
  );
}
