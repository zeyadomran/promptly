import { app, type BrowserWindow } from 'electron';

import type { WindowKind } from '../../shared/contracts/window';
import { canRecover, type WindowRecovery } from './visibility';

/** Native close behavior belongs to the window owner, including the Settings return route. */
export function watchWindowLifecycle(
  window: BrowserWindow,
  kind: WindowKind,
  owner: {
    closing: () => boolean;
    recovery: WindowRecovery;
    hide: () => void;
    closed: () => void;
  }
) {
  window.on('close', (event) => {
    if (owner.closing() || kind !== 'main') return;
    event.preventDefault();
    if (canRecover(owner.recovery)) owner.hide();
    else app.quit();
  });
  window.once('closed', owner.closed);
}
