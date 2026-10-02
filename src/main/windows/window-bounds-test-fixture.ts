import type { BrowserWindow } from 'electron';

import { defaultSettings, settingsSchema } from '../../shared/contracts/settings';
import type { SettingsService } from '../settings/service';
import type { Rectangle } from './geometry';
import { WindowBounds } from './window-bounds';

export function windowBoundsFixture(platform: NodeJS.Platform = 'win32') {
  let rectangle: Rectangle = { x: 10, y: 10, width: 440, height: 600 };
  let snapshot = { revision: 0, settings: defaultSettings() };
  const listeners = new Map<string, () => void>();
  const window = {
    on: (event: string, listener: () => void) => listeners.set(event, listener),
    isDestroyed: () => false,
    getNormalBounds: () => ({ ...rectangle }),
    getBounds: () => ({ ...rectangle }),
    setBounds: (next: Rectangle) => {
      rectangle = next;
    },
    setMinimumSize: (_width: number, _height: number) => undefined,
    setMaximumSize: (_width: number, _height: number) => undefined,
    isFullScreen: () => false,
    isMaximized: () => false
  };
  const update: SettingsService['services']['updateSettings'] = (patch) => {
    snapshot = {
      revision: snapshot.revision + 1,
      settings: settingsSchema.parse({ ...snapshot.settings, ...patch })
    };
    return Promise.resolve({ ok: true, value: snapshot });
  };

  const settings = {
    get current() {
      return snapshot;
    },
    services: { updateSettings: update }
  };
  const errors: unknown[] = [];
  const onError = (error: unknown) => {
    errors.push(error);
  };

  const bounds = new WindowBounds(
    window as unknown as BrowserWindow,
    settings as unknown as SettingsService,
    'compact',
    onError,
    platform
  );

  return { window, bounds, settings, errors, listeners, snapshot: () => snapshot };
}
