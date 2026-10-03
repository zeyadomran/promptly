import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** Owned Squirrel installation paths; none of these fixture executables are launched. */
export function loginTestFixture(directory: string) {
  const applicationDirectory = path.join(directory, 'Jane Doe Promptly');
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
    getLoginItemSettings: ({ path: target }: { path: string }) => {
      // Electron 44.5.1 formats the exact Run comparator but parses launch-item lookup.
      const exact = target.startsWith('"') && target.endsWith('"') ? target.slice(1, -1) : target;
      const lookup = /^"([^"]*)"/.exec(target)?.[1] ?? target.split(/\s/)[0] ?? '';
      const found = loginEntries.get(lookup) === true;

      return {
        openAtLogin: loginEntries.get(exact) ?? false,
        executableWillLaunchAtLogin: found && approved.get(lookup) !== false,
        launchItems: found
          ? [
              {
                name: 'com.squirrel.Promptly.Promptly',
                scope: 'user',
                args: [],
                enabled: approved.get(lookup) !== false
              }
            ]
          : []
      };
    }
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
