import type { DesktopOperations } from '../../shared/contracts/operations';
import type { WindowLifecycle } from './window-lifecycle';

export type WindowOperations = Pick<
  DesktopOperations,
  | 'getWindowState'
  | 'getWindowRecovery'
  | 'returnToMainWindow'
  | 'setWindowMode'
  | 'setWindowVisibility'
  | 'openDesktopWindow'
  | 'quitApplication'
>;

export function lifecycleServices(
  getLifecycle: () => WindowLifecycle | undefined
): WindowOperations {
  const services = () => {
    const lifecycle = getLifecycle();

    if (lifecycle === undefined) throw new Error('Window lifecycle unavailable.');
    return lifecycle.services;
  };

  return {
    getWindowState: (request) => services().getWindowState(request),
    getWindowRecovery: (request) => services().getWindowRecovery(request),
    returnToMainWindow: (request) => services().returnToMainWindow(request),
    setWindowMode: (request) => services().setWindowMode(request),
    setWindowVisibility: (request) => services().setWindowVisibility(request),
    openDesktopWindow: (request) => services().openDesktopWindow(request),
    quitApplication: (request) => services().quitApplication(request)
  };
}
