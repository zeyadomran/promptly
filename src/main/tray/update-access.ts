import type { createDesktopUpdates } from '../updates/desktop-updates';

/** Resolve the main-owned updater lazily during startup and retirement. */
export function trayUpdateAccess(
  getUpdates: () => Pick<ReturnType<typeof createDesktopUpdates>, 'ready' | 'restart'> | undefined
) {
  return {
    ready: () => getUpdates()?.ready() === true,
    restart: () => getUpdates()?.restart()
  };
}
