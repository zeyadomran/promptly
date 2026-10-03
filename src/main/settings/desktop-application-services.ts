import { app, shell } from 'electron';

import type { WindowLifecycle } from '../windows/window-lifecycle';
import { applicationServices } from './application-services';

export function desktopApplicationServices(getLifecycle: () => WindowLifecycle | undefined) {
  return applicationServices(
    () => app.getVersion(),
    (url) => shell.openExternal(url),
    async () => {
      const lifecycle = getLifecycle();

      if (lifecycle === undefined) throw new Error('Window lifecycle unavailable.');
      await lifecycle.showWiki();
    }
  );
}
