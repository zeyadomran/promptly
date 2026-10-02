import { app } from 'electron';
import squirrelStartup from 'electron-squirrel-startup';

/** Setup events are owned by Squirrel; they must never initialize desktop effects. */
export function ownApplication(): boolean {
  if (process.platform !== 'win32' || process.arch !== 'x64') {
    console.error('Promptly supports Windows x64 only.');
    app.exit(1);
    return false;
  }

  app.setAppUserModelId('com.squirrel.Promptly.Promptly');
  if (squirrelStartup) return false;
  const primary = app.requestSingleInstanceLock();

  if (!primary) app.quit();
  return primary;
}
