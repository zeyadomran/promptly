import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { app } from 'electron';

import { createDockController } from '../../../src/main/settings/dock-controller';
import { defaultSettings } from '../../../src/shared/contracts/settings';

/** Never permit an inherited fixture flag to change a developer's login/Dock preferences. */
export function hostedNativePreferences(profile: string) {
  const enabled = process.env['PROMPTLY_SETTINGS_UI_NATIVE'] === '1';

  if (
    enabled &&
    (process.env['GITHUB_ACTIONS'] !== 'true' ||
      process.env['RUNNER_ENVIRONMENT'] !== 'github-hosted' ||
      !['Windows', 'macOS'].includes(process.env['RUNNER_OS'] ?? '') ||
      !['win32', 'darwin'].includes(process.platform))
  )
    throw new Error('Native preference qualification requires an ephemeral hosted runner.');
  let initial: { login: boolean; dock: boolean } | undefined;

  return {
    enabled,
    capture: () => {
      if (enabled)
        initial = {
          login: app.getLoginItemSettings().openAtLogin,
          dock: process.platform === 'darwin' && (app.dock?.isVisible() ?? false)
        };
    },
    restore: async () => {
      if (initial === undefined) return;
      const failures: unknown[] = [];

      try {
        app.setLoginItemSettings({ openAtLogin: initial.login });
        if (app.getLoginItemSettings().openAtLogin !== initial.login)
          throw new Error('Initial login preference was not restored.');
      } catch (error) {
        failures.push(error);
      }

      try {
        if (process.platform === 'darwin')
          await createDockController(app.dock).apply({
            ...defaultSettings(),
            showDockIcon: initial.dock
          });
      } catch (error) {
        failures.push(error);
      }

      await writeFile(
        path.join(profile, 'native-preferences-restored.json'),
        JSON.stringify({
          hosted: true,
          initial,
          restored: {
            login: app.getLoginItemSettings().openAtLogin,
            dock: process.platform === 'darwin' && (app.dock?.isVisible() ?? false)
          },
          restorationOk: failures.length === 0
        })
      );
      if (failures.length > 0)
        throw new AggregateError(failures, 'Native preference restoration failed.');
    }
  };
}
