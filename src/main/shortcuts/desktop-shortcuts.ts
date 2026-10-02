import { app, globalShortcut, powerMonitor } from 'electron';

import {
  keyboardExecutable,
  launchKeyboard,
  NativeKeyboardHook
} from '../platform/keyboard/keyboard-hook';
import type { SettingsService } from '../settings/service';
import type { WindowLifecycle } from '../windows/window-lifecycle';
import { CaptureTrigger } from './capture-trigger';
import { CommandRunner } from './command-runner';
import { Shortcuts } from './service';

/** Command targets are resolved at invocation; no captured foreground or preference snapshot. */
export function createDesktopShortcuts(
  lifecycle: () => WindowLifecycle | undefined,
  settings: () => SettingsService | undefined
) {
  const capture = new CaptureTrigger();
  const commands = new CommandRunner();
  const shortcuts = new Shortcuts(
    globalShortcut,
    {
      capture: () => {
        capture.fire();
      },
      captureAvailable: () => capture.available,
      open: () => {
        commands.run(
          'open',
          async () => {
            await lifecycle()?.toggle();
          },
          () => {
            lifecycle()?.recoverVisibility();
          }
        );
      },
      pin: () => {
        commands.run(
          'pin',
          async () => {
            const preferences = settings();

            if (preferences !== undefined) {
              await preferences.services.updateSettings({
                alwaysOnTop: !preferences.current.settings.alwaysOnTop
              });
            }
          },
          () => undefined
        );
      }
    },
    process.platform,
    () => {
      lifecycle()?.recoverVisibility();
    }
  );

  if (process.platform === 'win32') {
    const executable = keyboardExecutable(process.resourcesPath, app.getAppPath(), app.isPackaged);

    shortcuts.attachHook(
      new NativeKeyboardHook(
        () => launchKeyboard(executable),
        (frame) => {
          shortcuts.receive(frame);
        }
      )
    );
  }

  const suspend = () => {
    void shortcuts.sleep().catch(() => {
      console.warn('Unable to suspend shortcut listener.');
    });
  };

  const resume = () => {
    void shortcuts.resume().catch(() => {
      console.warn('Unable to resume shortcut listener.');
      lifecycle()?.recoverVisibility();
    });
  };

  powerMonitor.on('suspend', suspend);
  powerMonitor.on('resume', resume);
  return {
    shortcuts,
    capture,
    close: async () => {
      powerMonitor.removeListener('suspend', suspend);
      powerMonitor.removeListener('resume', resume);
      await shortcuts.close();
    }
  };
}
