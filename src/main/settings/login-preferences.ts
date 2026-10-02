import { statSync } from 'node:fs';
import path from 'node:path';

export interface NativePreferences {
  setLogin: (enabled: boolean) => void;
  getLogin: () => boolean;
}

interface LoginApplication {
  readonly isPackaged: boolean;
  setLoginItemSettings: (settings: { path: string; args: string[]; openAtLogin: boolean }) => void;
  getLoginItemSettings: (settings: { path: string; args: string[] }) => { openAtLogin: boolean };
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
    setLogin: (openAtLogin) => {
      application.setLoginItemSettings({ openAtLogin, path: target, args: [] });
    },
    getLogin: () => application.getLoginItemSettings({ path: target, args: [] }).openAtLogin
  };
}
