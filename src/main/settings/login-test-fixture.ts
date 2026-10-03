import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** Owned Squirrel installation paths; none of these fixture executables are launched. */
export function loginTestFixture(directory: string) {
  const applicationDirectory = path.join(directory, 'Promptly');
  const installedExecutable = path.join(applicationDirectory, 'app-0.1.0', 'Promptly.exe');
  const stableExecutable = path.join(applicationDirectory, 'Promptly.exe');
  const loginEntries = new Map<string, boolean>();
  const approved = new Map<string, boolean>();

  mkdirSync(path.dirname(installedExecutable), { recursive: true });
  for (const filename of [
    installedExecutable,
    stableExecutable,
    path.join(applicationDirectory, 'Update.exe')
  ])
    writeFileSync(filename, 'owned fixture, not executed');
  const application = {
    isPackaged: true,
    setLoginItemSettings: ({
      path: target,
      openAtLogin,
      enabled = true
    }: {
      path: string;
      openAtLogin: boolean;
      enabled?: boolean;
    }) => {
      loginEntries.set(target, openAtLogin);
      approved.set(target, openAtLogin && enabled);
    },
    getLoginItemSettings: ({ path: target }: { path: string }) => ({
      openAtLogin: loginEntries.get(target) ?? false,
      executableWillLaunchAtLogin:
        loginEntries.get(target) === true && approved.get(target) !== false,
      launchItems:
        loginEntries.get(target) === true
          ? [
              {
                name: 'com.squirrel.Promptly.Promptly',
                scope: 'user',
                args: [],
                enabled: approved.get(target) !== false
              }
            ]
          : []
    })
  };
  const createUpgradeExecutable = () => {
    const filename = path.join(applicationDirectory, 'app-0.2.0', 'Promptly.exe');

    mkdirSync(path.dirname(filename));
    writeFileSync(filename, 'owned fixture, not executed');
    return filename;
  };

  return {
    applicationDirectory,
    installedExecutable,
    stableExecutable,
    loginEntries,
    approved,
    application,
    createUpgradeExecutable
  };
}
