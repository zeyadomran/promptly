import { app, type BrowserWindow } from 'electron';

import type { WindowKind } from '../../shared/contracts/window';
import type { PreviousAppService } from '../previous-app/service';
import { watchPreviousAppFocus } from './previous-app-focus';
import { watchRendererRecovery } from './renderer-recovery';
import { canRecover, type WindowRecovery } from './visibility';

/** Native close behavior belongs to the window owner, including the Settings return route. */
export function watchWindowLifecycle(
  window: BrowserWindow,
  kind: WindowKind,
  owner: {
    previousApp?: Pick<PreviousAppService, 'captureAfterFocus'> | undefined;
    opened: () => void;
    closing: () => boolean;
    recovery: WindowRecovery;
    hide: () => void;
    closed: () => void;
    ready: () => boolean;
    reload: () => Promise<BrowserWindow>;
    error: (error: unknown) => void;
  }
) {
  watchPreviousAppFocus(window, owner.previousApp, owner.closing, owner.error);
  const opened = () => {
    if (!owner.closing()) owner.opened();
  };

  window.on('show', opened);
  window.on('restore', opened);
  window.on('close', (event) => {
    if (owner.closing() || kind !== 'main') return;
    event.preventDefault();
    if (canRecover(owner.recovery)) owner.hide();
    else app.quit();
  });
  window.once('closed', owner.closed);
  watchRendererRecovery(window, owner);
}
