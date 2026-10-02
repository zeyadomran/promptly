import { shell } from 'electron';

import type { DesktopOperations } from '../../../shared/contracts/operations';
import { failure } from '../../../shared/contracts/result';
import type { MacosSelection } from './macos-selection';

const settingsUrls = {
  accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
  inputMonitoring: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent'
} as const;

/** Fixed destinations only; schema validation rejects renderer URLs and paths. */
export function macosPermissionServices(
  selection: MacosSelection | undefined
): Partial<DesktopOperations> {
  if (selection === undefined) return {};
  return {
    getMacosPermissions: async () => ({ ok: true, value: await selection.getPermissions() }),
    openMacosPermissionSettings: async ({ permission }) => {
      try {
        await shell.openExternal(settingsUrls[permission]);
        return { ok: true, value: { opened: true } };
      } catch {
        return failure('UNAVAILABLE', 'System Settings could not be opened.');
      }
    }
  };
}
