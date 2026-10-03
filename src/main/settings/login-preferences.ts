import { statSync } from 'node:fs';
import path from 'node:path';

export interface NativePreferences {
  setLogin: (enabled: boolean, approved?: boolean) => void;
  getLogin: () => boolean;
  getLoginState: () => NativeLoginState;
}

export interface NativeLoginState {
  registered: boolean;
  enabled: boolean;
  approved: boolean;
}

interface LoginApplication {
  readonly isPackaged: boolean;
  setLoginItemSettings: (settings: {
    path: string;
    args: string[];
    openAtLogin: boolean;
    enabled: boolean;
  }) => void;
  getLoginItemSettings: (settings: { path: string; args: string[] }) => {
    openAtLogin: boolean;
    executableWillLaunchAtLogin: boolean;
    launchItems: { name: string; scope: string; args: string[]; enabled: boolean }[];
  };
}

/** Uninstall removes native registration without changing retained database preferences. */
export function prepareSquirrelLogin(
  application: LoginApplication & { setAppUserModelId: (identity: string) => void },
  command: string | undefined,
  onError: (error: unknown) => void,
  executable = process.execPath
): void {
  if (command !== '--squirrel-uninstall') return;
  try {
    application.setAppUserModelId('com.squirrel.Promptly.Promptly');
    const preferences = loginPreferences(application, executable);

    preferences.setLogin(false);
    if (preferences.getLogin()) throw new Error('Uninstall login cleanup was rejected.');
  } catch (error) {
    // Standard Squirrel shortcut removal and quit must still run after a native failure.
    onError(error);
  }
}

export function loginPreferences(
  application: LoginApplication,
  executable = process.execPath
): NativePreferences {
  const directory = path.dirname(executable);
  const stable = path.resolve(directory, '..', path.basename(executable));
  const installed =
    application.isPackaged &&
    /^app-\d/.test(path.basename(directory)) &&
    statSync(stable, { throwIfNoEntry: false })?.isFile() === true &&
    statSync(path.resolve(directory, '..', 'Update.exe'), { throwIfNoEntry: false })?.isFile() ===
      true;
  const target = installed ? stable : executable;

  return {
    setLogin: (openAtLogin, enabled = true) => {
      application.setLoginItemSettings({ openAtLogin, enabled, path: target, args: [] });
    },
    getLogin: () => application.getLoginItemSettings({ path: target, args: [] }).openAtLogin,
    getLoginState: () => {
      const status = application.getLoginItemSettings({ path: target, args: [] });
      const entry = status.launchItems.find(
        (item) =>
          item.name === 'com.squirrel.Promptly.Promptly' &&
          item.scope === 'user' &&
          item.args.length === 0
      );

      if (status.openAtLogin && entry === undefined)
        throw new Error('Login registration could not be verified.');
      return {
        registered: status.openAtLogin,
        enabled: status.executableWillLaunchAtLogin,
        approved: entry?.enabled ?? false
      };
    }
  };
}
