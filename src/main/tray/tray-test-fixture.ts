import { CopyService } from '../copy/service';
import type { SettingsController } from '../settings/controllers';
import { testSettings } from '../settings/settings-test-fixture';
import { shortcutFixture } from '../shortcuts/shortcut-test-fixture';
import { LibraryMutations } from '../storage/library-mutations';
import type { StorageOperation, StorageRequest } from '../storage/protocol';
import { TrayCoordinator } from './coordinator';
import type { TrayItem } from './ports';

export function trayFixture() {
  let second = 0;
  const controllers: SettingsController[] = [];
  const fixture = testSettings(
    { available: controllers, unavailable: [] },
    () => new Date(Date.UTC(2026, 9, 2, 10, 0, second++))
  );
  const keyboard = shortcutFixture((callback) => callback);
  const mutations = new LibraryMutations();
  const clipboard: string[] = [];
  const windows: string[] = [];
  let menu: readonly TrayItem[] = [];
  let destroyed = true;
  let pausedIcon = false;
  let captured = 0;
  let denied = false;
  let readHeld = Promise.resolve();
  let readEntered: () => void = () => undefined;
  const transport = {
    async call<K extends StorageOperation>(name: K, input: StorageRequest<K>) {
      const result = await fixture.storage.call(name, input);

      if (name === 'searchSnippets') {
        readEntered();
        await readHeld;
      }

      return result;
    }
  };

  keyboard.commands.capture = () => {
    captured += 1;
  };

  keyboard.commands.open = () => {
    windows.push('shortcut open');
  };

  keyboard.commands.pin = () => {
    windows.push('shortcut pin');
  };

  const copy = new CopyService(fixture.storage, mutations, {
    platform: 'win32',
    owner: () => undefined,
    settings: () => fixture.service.current.settings,
    writeText: (text) => {
      clipboard.push(text);
      return Promise.resolve();
    },
    hide: () => {
      windows.push('unexpected hide');
      return Promise.resolve(true);
    }
  });
  const tray = new TrayCoordinator(
    transport,
    keyboard.shortcuts,
    {
      create: () => {
        if (denied) throw new Error('Owned tray unavailable');
        destroyed = false;
        menu = [];
        return {
          isDestroyed: () => destroyed,
          setMenu: (items) => {
            menu = items;
          },
          setPaused: (value) => {
            pausedIcon = value;
          },
          setStatus: () => undefined,
          destroy: () => {
            destroyed = true;
          }
        };
      }
    },
    {
      copy: () => copy,
      open: (kind) => {
        windows.push(kind);
        return Promise.resolve();
      },
      recover: () => {
        windows.push('recovered');
        return Promise.resolve();
      },
      quit: () => {
        windows.push('quit');
      },
      error: () => {
        windows.push('error');
      }
    }
  );

  return {
    fixture,
    controllers,
    keyboard,
    mutations,
    clipboard,
    windows,
    copy,
    tray,
    menu: () => menu,
    pausedIcon: () => pausedIcon,
    captured: () => captured,
    deny: (value: boolean) => {
      denied = value;
    },
    holdRead: () => {
      let release: () => void = () => undefined;
      const entered = new Promise<void>((resolve) => {
        readEntered = resolve;
      });

      readHeld = new Promise<void>((resolve) => {
        release = resolve;
      });
      return { entered, release };
    }
  };
}
