import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { defaultSettings } from '../../../../shared/contracts/settings';
import { SettingsContext } from '../settings-context';
import { GeneralSettings } from './GeneralSettings';

afterEach(() => {
  vi.unstubAllGlobals();
});

it('reports actual macOS Dock and status-icon visibility rather than their stored requested defaults', async () => {
  vi.stubGlobal('promptly', {
    platform: 'darwin',
    getWindowRecovery: () =>
      Promise.resolve({
        ok: true,
        value: {
          tray: false,
          trayController: false,
          shortcut: false,
          dock: false,
          mainReachable: true
        }
      })
  });
  const preferences = {
    revision: 0,
    settings: defaultSettings(),
    theme: 'light' as const,
    error: undefined,
    update: vi.fn(() =>
      Promise.resolve({
        ok: false as const,
        error: { code: 'UNAVAILABLE' as const, message: 'Unavailable' }
      })
    )
  };

  render(
    <SettingsContext value={preferences}>
      <GeneralSettings />
    </SettingsContext>
  );
  const dock = screen.getByRole('switch', { name: 'Show Dock icon' });

  await waitFor(() => {
    expect(dock).toBeEnabled();
  });
  expect(preferences.settings.showDockIcon).toBe(true);
  expect(dock).not.toBeChecked();
  const tray = screen.getByRole('switch', { name: 'Show in menu bar' });

  expect(preferences.settings.showInTray).toBe(true);
  expect(tray).not.toBeChecked();
  expect(tray).toBeDisabled();
});
