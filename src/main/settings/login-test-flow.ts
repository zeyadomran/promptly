import assert from 'node:assert/strict';
import path from 'node:path';

import { loginPreferences, prepareSquirrelLogin } from './login-preferences';
import type { loginTestFixture } from './login-test-fixture';

/** Continue the canonical settings flow through installed upgrade and uninstall boundaries. */
export function exerciseLoginInstallation(
  installation: ReturnType<typeof loginTestFixture>,
  fixtureDirectory: string,
  login: ReturnType<typeof loginPreferences>
): void {
  const upgradedExecutable = installation.createUpgradeExecutable();

  assert.equal(loginPreferences(installation.application, upgradedExecutable).getLogin(), true);
  const unpackedExecutable = path.join(fixtureDirectory, 'unpacked', 'Promptly.exe');
  const unpacked = loginPreferences(installation.application, unpackedExecutable);

  unpacked.setLogin(true);
  assert.equal(installation.loginEntries.get(unpackedExecutable), true);
  const development = loginPreferences(
    { ...installation.application, isPackaged: false },
    installation.installedExecutable
  );

  development.setLogin(true);
  assert.equal(installation.loginEntries.get(installation.installedExecutable), true);
  let applicationId = '';
  const setupApplication = {
    ...installation.application,
    setAppUserModelId: (identity: string) => {
      applicationId = identity;
    }
  };
  const cleanupErrors: unknown[] = [];
  const reportCleanupError = (error: unknown) => cleanupErrors.push(error);

  prepareSquirrelLogin(
    setupApplication,
    '--squirrel-updated',
    reportCleanupError,
    upgradedExecutable
  );
  assert.equal(login.getLogin(), true);
  prepareSquirrelLogin(
    setupApplication,
    '--squirrel-uninstall',
    reportCleanupError,
    upgradedExecutable
  );
  assert.equal(applicationId, 'com.squirrel.Promptly.Promptly');
  assert.equal(login.getLogin(), false);
  assert.deepEqual(cleanupErrors, []);
  const deniedCleanup = new Error('Native removal denied');

  prepareSquirrelLogin(
    {
      ...setupApplication,
      setLoginItemSettings: () => {
        throw deniedCleanup;
      }
    },
    '--squirrel-uninstall',
    reportCleanupError,
    upgradedExecutable
  );
  assert.deepEqual(cleanupErrors, [deniedCleanup]);
}
