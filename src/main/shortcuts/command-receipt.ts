import { app } from 'electron';

import type { DesktopError } from '../../shared/contracts/result';
import type { ShortcutAction } from './bindings';

export const shortcutCommandChannel = 'promptly:shortcut-command-receipt';
export interface ShortcutCommandReceipt {
  action: ShortcutAction;
  phase: 'requested' | 'completed' | 'failed';
  errorCode?: DesktopError['code'];
}

/** Main-local diagnostic observer only. No history, raw keys, selection, paths or renderer API. */
export function reportShortcutCommand(receipt: ShortcutCommandReceipt): void {
  if (app.listenerCount(shortcutCommandChannel) > 0) app.emit(shortcutCommandChannel, receipt);
}
