import { app, systemPreferences } from 'electron';

import type { DesktopResult } from '../../shared/contracts/result';
import type {
  SizeMode,
  WindowKind,
  WindowRecoveryState,
  WindowState
} from '../../shared/contracts/window';
import type { WindowOperations } from './lifecycle-services';

/** Narrow IPC commands use the same serialized lifecycle owner as native routes. */
export function createWindowOperations(owner: {
  state: (kind?: WindowKind) => WindowState;
  recovery: () => WindowRecoveryState;
  enqueue: (action: () => Promise<WindowState>) => Promise<DesktopResult<WindowState>>;
  show: (kind?: WindowKind) => Promise<unknown>;
  hide: () => void;
  closeSettings: () => void;
  switchMode: (mode: SizeMode, reducedMotion: boolean) => Promise<void>;
}): WindowOperations {
  return {
    getWindowState: () => Promise.resolve({ ok: true, value: owner.state() }),
    getWindowRecovery: () => Promise.resolve({ ok: true, value: owner.recovery() }),
    returnToMainWindow: () =>
      owner.enqueue(async () => {
        await owner.show();
        owner.closeSettings();
        return owner.state();
      }),
    setWindowMode: ({ mode, reducedMotion }) =>
      owner.enqueue(async () => {
        await owner.show();
        await owner.switchMode(
          mode,
          reducedMotion || systemPreferences.getAnimationSettings().prefersReducedMotion
        );
        return owner.state();
      }),
    setWindowVisibility: ({ visible }) =>
      owner.enqueue(async () => {
        if (visible) await owner.show();
        else owner.hide();
        return owner.state();
      }),
    openDesktopWindow: ({ kind }) =>
      owner.enqueue(async () => {
        await owner.show(kind);
        return owner.state(kind);
      }),
    quitApplication: () => {
      app.quit();
      return Promise.resolve({ ok: true, value: {} });
    }
  };
}
