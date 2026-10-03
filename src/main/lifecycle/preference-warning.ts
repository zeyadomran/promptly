import { app, dialog } from 'electron';

import type { SettingsService } from '../settings/service';
import type { createFailureRecovery } from './failure-recovery';

/** Requested preferences remain durable; a warning never claims native registration succeeded. */
export async function warnStartupPreferences(
  settings: SettingsService,
  recovery: ReturnType<typeof createFailureRecovery>
): Promise<void> {
  if (recovery.isActive() || settings.startupUnavailable.length === 0) return;
  const unavailable = [
    ...(settings.isUnavailable('showInTray') ? ['The system tray is unavailable.'] : []),
    ...(settings.isUnavailable('launchAtLogin') ? ['Launch at login could not be verified.'] : [])
  ];
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: 'Native preferences unavailable',
    message: 'Some native preferences could not be applied.',
    detail: `${unavailable.join('\n')}\nYour saved preferences remain unchanged. These controls are unavailable until restart; Promptly can continue with its library window.`,
    buttons: ['Continue', 'Quit'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
    signal: recovery.warningSignal
  });

  if (!recovery.isActive() && result.response === 1) app.quit();
}
