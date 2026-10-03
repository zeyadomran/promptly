import { app, shell } from 'electron';

import { applicationServices } from './application-services';

export function desktopApplicationServices() {
  return applicationServices(
    () => app.getVersion(),
    (url) => shell.openExternal(url)
  );
}
