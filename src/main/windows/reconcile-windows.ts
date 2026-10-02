import type { BrowserWindow } from 'electron';

import type { SizeMode, WindowKind } from '../../shared/contracts/window';
import { clampBounds, windowGeometry } from './geometry';
import { displayAreas } from './window-bounds';

export function reconcileWindows(
  windows: Iterable<[WindowKind, BrowserWindow]>,
  mode: SizeMode
): void {
  for (const [kind, window] of windows) {
    if (kind === 'main' || window.isDestroyed()) continue;
    const target = clampBounds(window.getNormalBounds(), displayAreas(), mode, kind);
    const minimum = windowGeometry(kind, mode);

    window.setMinimumSize(
      Math.min(minimum.minWidth, target.width),
      Math.min(minimum.minHeight, target.height)
    );
    window.setBounds(target);
  }
}
