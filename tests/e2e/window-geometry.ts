import type { ElectronApplication } from '@playwright/test';
import type { Rectangle } from 'electron';

import { writeWindowReceipt } from './native-window-receipt';

export function expectedRegularRestore(saved: Rectangle, area: Rectangle): Rectangle {
  const width = Math.min(area.width, Math.max(760, saved.width));
  const height = Math.min(area.height, Math.max(480, saved.height));

  return {
    width,
    height,
    x: Math.max(area.x, Math.min(saved.x, area.x + area.width - width)),
    y: Math.max(area.y, Math.min(saved.y, area.y + area.height - height))
  };
}

export async function geometryReceipt(application: ElectronApplication, phase: string) {
  const receipt = await application.evaluate(({ BrowserWindow, screen }) => {
    const window = BrowserWindow.getAllWindows()[0];

    if (window === undefined) throw new Error('Missing owned main window.');
    const bounds = window.getBounds();

    return {
      bounds,
      normal: window.getNormalBounds(),
      minimum: window.getMinimumSize(),
      maximum: window.getMaximumSize(),
      area: screen.getDisplayMatching(bounds).workArea,
      displays: screen
        .getAllDisplays()
        .map(({ workArea, scaleFactor }) => ({ workArea, scaleFactor }))
    };
  });

  await writeWindowReceipt(`native-geometry-${phase}`, { phase, ...receipt });
  console.log('Owned native geometry:', JSON.stringify({ phase, ...receipt }));
  return receipt;
}
