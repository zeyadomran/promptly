import type { DesktopOperations } from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import type { CaptureNative } from '../capture/ports';
import type { SettingsService } from '../settings/service';
import type { TransferDialogs } from '../storage/transfer/native-dialogs';
import type { WindowLifecycle } from '../windows/window-lifecycle';
import { PreviousAppService } from './service';

export function desktopPreviousApp(
  native: CaptureNative | undefined,
  settings: SettingsService,
  dialogs: TransferDialogs,
  lifecycle: () => WindowLifecycle | undefined
) {
  const previous = new PreviousAppService({
    native: native ?? {
      foregroundIdentityResult: () => Promise.resolve({ status: 'helperUnavailable' }),
      sourceAvailable: () => Promise.resolve(false),
      activateSource: () => Promise.resolve('helperUnavailable')
    },
    ownPid: process.pid,
    alwaysOnTop: () => settings.current.settings.alwaysOnTop,
    hide: () => {
      lifecycle()?.hide();
    }
  });
  const services: Pick<DesktopOperations, 'getPreviousApp' | 'returnToPreviousApp'> = {
    getPreviousApp: async () => ({ ok: true, value: await previous.getPreviousApp() }),
    returnToPreviousApp: async (_input, context) => {
      if (context === undefined || dialogs.owner(context.senderId)?.isAlive() !== true)
        return failure('UNAUTHORIZED', 'The originating window is unavailable.');
      return { ok: true, value: await previous.returnToPreviousApp() };
    }
  };

  return { previous, services };
}
