import type { WebContents } from 'electron';

import type { DesktopOperations } from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import type { Shortcuts } from './service';

export function shortcutServices(
  shortcuts: Shortcuts,
  changed: () => void = () => undefined
): Pick<DesktopOperations, 'getShortcutStatus' | 'setCapturePaused' | 'retryShortcuts'> {
  return {
    getShortcutStatus: () => Promise.resolve({ ok: true, value: shortcuts.status }),
    retryShortcuts: () => {
      try {
        if (!shortcuts.retry())
          return Promise.resolve(
            failure(
              'UNAVAILABLE',
              'Finish recording or resume Promptly before retrying. Restart if shortcut recovery is unavailable.'
            )
          );
        changed();
        return Promise.resolve({ ok: true, value: shortcuts.status });
      } catch {
        return Promise.resolve(
          failure(
            'UNAVAILABLE',
            'Windows shortcut registration failed. Restart Promptly before retrying.'
          )
        );
      }
    },
    setCapturePaused: ({ paused }) => {
      shortcuts.setPaused(paused);
      changed();
      return Promise.resolve({ ok: true, value: shortcuts.status });
    }
  };
}

/** Only the calling renderer owns its recorder; navigation/crash/destruction releases it. */
export function recorderServices(shortcuts: Shortcuts) {
  const owners = new WeakSet<WebContents>();

  return (sender: WebContents): Pick<DesktopOperations, 'setShortcutRecording'> => ({
    setShortcutRecording: ({ active }) => {
      if (!owners.has(sender)) {
        owners.add(sender);
        const release = () => {
          shortcuts.release(sender.id);
        };

        sender.on('destroyed', release);
        sender.on('render-process-gone', release);
        sender.on('did-start-navigation', (_event, _url, _inPlace, mainFrame) => {
          if (mainFrame) release();
        });
      }

      shortcuts.record(sender.id, active);
      return Promise.resolve({ ok: true, value: shortcuts.status });
    }
  });
}
