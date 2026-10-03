import type { BrowserWindow } from 'electron';

import {
  focusSearchChannel,
  type NativeShellView,
  shellNavigationChannel,
  type SizeMode,
  type WindowKind,
  type WindowRecoveryState,
  type WindowState
} from '../../shared/contracts/window';
import type { WindowRecovery } from './visibility';

export function publishShellNavigation(window: BrowserWindow, view: NativeShellView) {
  window.webContents.send(shellNavigationChannel, view);
  if (view === 'library') window.webContents.send(focusSearchChannel);
}

export function desktopRootKind(onboardingComplete: boolean, mainCreated: boolean) {
  return onboardingComplete || mainCreated ? 'main' : 'onboarding';
}

export function describeWindow(
  window: BrowserWindow | undefined,
  kind: WindowKind,
  mode: SizeMode
): WindowState {
  return { kind, mode, visible: window?.isVisible() === true && !window.isMinimized() };
}

export function describeRecovery(
  recovery: WindowRecovery,
  window: BrowserWindow | undefined
): WindowRecoveryState {
  return {
    tray: recovery.trayAvailable(),
    trayController: recovery.trayControllerAvailable?.() === true,
    shortcut: recovery.shortcutAvailable(),
    mainReachable: window?.isVisible() === true || window?.isMinimized() === true
  };
}
