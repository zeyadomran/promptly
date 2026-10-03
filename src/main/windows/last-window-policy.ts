import { app } from 'electron';

/** Keep the process only while a native route can reopen a closed window. */
export function installLastWindowPolicy(canReopen: () => boolean): () => void {
  const closed = () => {
    if (!canReopen()) app.quit();
  };

  app.on('window-all-closed', closed);
  return () => {
    app.removeListener('window-all-closed', closed);
  };
}
