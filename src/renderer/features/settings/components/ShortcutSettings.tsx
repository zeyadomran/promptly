import { useWindowRecovery } from '../hooks/use-window-recovery';

export function ShortcutSettings() {
  const recovery = useWindowRecovery();

  return (
    <div className="settings-feature-entry">
      <h2>Open Promptly</h2>
      <p>
        {recovery === undefined
          ? 'Checking keyboard access…'
          : recovery.shortcut
            ? 'The global shortcut is available.'
            : 'The global shortcut is currently unavailable.'}
      </p>
      <p>Shortcut recording and capture preferences are not available here yet.</p>
    </div>
  );
}
