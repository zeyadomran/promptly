import { type ElectronApplication, expect } from '@playwright/test';

import { writeWindowReceipt } from './native-window-receipt';

interface VisibilityProbe {
  events: string[];
}

export async function beginVisibilityReceipt(application: ElectronApplication) {
  await application.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    const probe = { events: [] as string[] };

    (globalThis as typeof globalThis & { visibilityProbe?: VisibilityProbe }).visibilityProbe =
      probe;
    window?.on('show', () => probe.events.push('show'));
    window?.on('hide', () => probe.events.push('hide'));
    window?.on('minimize', () => probe.events.push('minimize'));
    window?.on('restore', () => probe.events.push('restore'));
    window?.on('focus', () => probe.events.push('focus'));
    window?.on('blur', () => probe.events.push('blur'));
  });
}

export async function visibilityReceipt(application: ElectronApplication, phase: string) {
  const receipt = await application.evaluate(({ BrowserWindow, app }) => {
    const window = BrowserWindow.getAllWindows()[0];
    const probe = (globalThis as typeof globalThis & { visibilityProbe?: VisibilityProbe })
      .visibilityProbe;

    return {
      platform: process.platform,
      dock: app.dock?.isVisible() ?? false,
      visible: window?.isVisible() ?? false,
      minimized: window?.isMinimized() ?? false,
      focused: window?.isFocused() ?? false,
      pinned: window?.isAlwaysOnTop() ?? false,
      allWorkspaces: window?.isVisibleOnAllWorkspaces() ?? false,
      events: probe?.events ?? []
    };
  });

  await writeWindowReceipt(`native-visibility-${phase}`, { phase, ...receipt });
  console.log('Owned native visibility:', JSON.stringify({ phase, ...receipt }));
  return receipt;
}

export async function expectConcealed(
  application: ElectronApplication,
  phase: string,
  recoveryDock: boolean
) {
  const receipt = await visibilityReceipt(application, phase);

  expect(receipt.dock).toBe(recoveryDock);
  if (receipt.platform === 'win32') expect(receipt.minimized).toBe(true);
  else expect(receipt.visible).toBe(!recoveryDock);
}
