import { searchPageSchema, type SnippetPreview } from '../../shared/contracts/domain';
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
  let settingsRead = Promise.resolve();
  let settingsEntered: () => void = () => undefined;
  const controllers: SettingsController[] = [];
  const fixture = testSettings(
    { available: controllers, unavailable: [] },
    () => new Date(Date.UTC(2026, 9, 2, 10, 0, second++)),
    (name) => {
      if (name !== 'getSettings') return Promise.resolve();
      settingsEntered();
      return settingsRead;
    }
  );
  const keyboard = shortcutFixture((callback) => callback);
  const mutations = new LibraryMutations();
  const clipboard: string[] = [];
  const windows: string[] = [];
  let menu: readonly TrayItem[] = [];
  let recent: SnippetPreview[] = [];
  let destroyed = true;
  let pausedIcon = false;
  const statuses: string[] = [];
  let captured = 0;
  let denied = false;
  let readHeld = Promise.resolve();
  let readEntered: () => void = () => undefined;
  const transport = {
    async call<K extends StorageOperation>(name: K, input: StorageRequest<K>) {
      const result = await fixture.storage.call(name, input);

      if (name === 'searchSnippets') {
        if (result.ok) recent = searchPageSchema.parse(result.value).items;
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

  const copyEffects = {
    platform: 'win32',
    owner: () => undefined,
    settings: () => fixture.service.current.settings,
    writeText: (text: string) => {
      clipboard.push(text);
      return Promise.resolve();
    },
    hide: () => {
      windows.push('unexpected hide');
      return Promise.resolve(true);
    }
  };
  const copy = new CopyService(fixture.storage, mutations, copyEffects);
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
          setStatus: (message) => {
            statuses.push(message);
          },
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
    recent: () => recent,
    statuses,
    pausedIcon: () => pausedIcon,
    captured: () => captured,
    deny: (value: boolean) => {
      denied = value;
    },
    holdSettingsRead: () => {
      let release: () => void = () => undefined;
      const entered = new Promise<void>((resolve) => {
        settingsEntered = resolve;
      });

      settingsRead = new Promise<void>((resolve) => {
        release = resolve;
      });
      return { entered, release };
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
