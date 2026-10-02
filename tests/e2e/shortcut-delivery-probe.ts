import type { ElectronApplication, Page } from '@playwright/test';

import type { ShortcutCommandReceipt } from '../../src/main/shortcuts/command-receipt';
import { writeWindowReceipt } from './native-window-receipt';

interface Probe {
  callbacks: { open: number; pin: number; capture: number };
  phases: { requested: number; completed: number; failed: number };
  last: ShortcutCommandReceipt | null;
}
type OwnedProbe = typeof globalThis & { ownedShortcutProbe?: Probe };

/** Wrap real OS registrations, preserving their callbacks; store only bounded scalar counters. */
export async function observeShortcutDelivery(application: ElectronApplication, page: Page) {
  await application.evaluate(({ globalShortcut, app }) => {
    const probe: Probe = {
      callbacks: { open: 0, pin: 0, capture: 0 },
      phases: { requested: 0, completed: 0, failed: 0 },
      last: null
    };

    (globalThis as OwnedProbe).ownedShortcutProbe = probe;
    const register = globalShortcut.register.bind(globalShortcut);

    globalShortcut.register = (accelerator, callback) =>
      register(accelerator, () => {
        const role = accelerator.endsWith('F10')
          ? 'open'
          : accelerator.endsWith('F11')
            ? 'pin'
            : 'capture';

        probe.callbacks[role] = Math.min(1024, probe.callbacks[role] + 1);
        callback();
      });
    const events: NodeJS.EventEmitter = app;

    events.on('promptly:shortcut-command-receipt', (value: ShortcutCommandReceipt) => {
      probe.phases[value.phase] = Math.min(1024, probe.phases[value.phase] + 1);
      probe.last = value;
    });
  });

  return async (phase: string) => {
    const native = await application.evaluate(({ BrowserWindow, globalShortcut }) => ({
      ...(globalThis as OwnedProbe).ownedShortcutProbe,
      windows: BrowserWindow.getAllWindows()
        .slice(0, 8)
        .map((window) => ({
          pinned: window.isAlwaysOnTop(),
          visible: window.isVisible()
        })),
      openRegistered: globalShortcut.isRegistered('Control+Alt+F10'),
      pinRegistered: globalShortcut.isRegistered('Control+Alt+F11'),
      suspended: globalShortcut.isSuspended()
    }));
    const durable = await page.evaluate(() => window.promptly.getSettings({}));
    const status = await page.evaluate(() => window.promptly.getShortcutStatus({}));

    await writeWindowReceipt(`shortcut-command-${phase}`, {
      native,
      durable: durable.ok
        ? { ok: true, revision: durable.value.revision, pinned: durable.value.settings.alwaysOnTop }
        : durable,
      status
    });
  };
}
