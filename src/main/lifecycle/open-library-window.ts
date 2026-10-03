import { app } from 'electron';

import type { WindowLifecycle } from '../windows/window-lifecycle';
import type { createFailureRecovery } from './failure-recovery';

export function installWindowOpenCommands(
  lifecycle: () => WindowLifecycle | undefined,
  recovery: ReturnType<typeof createFailureRecovery>
): () => void {
  const open = () => {
    if (recovery.isActive()) return;
    void (async () => {
      await lifecycle()?.show();
    })().catch((error: unknown) => {
      void recovery.startup(error);
    });
  };

  app.on('second-instance', open);
  app.on('activate', open);
  return open;
}
