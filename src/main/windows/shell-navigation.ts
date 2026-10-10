import type { BrowserWindow } from 'electron';

import {
  focusSearchChannel,
  type NativeShellView,
  type ShellCommand,
  shellCommandChannel,
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

export function publishShellCommand(window: BrowserWindow, command: ShellCommand) {
  window.webContents.send(shellCommandChannel, command);
}

export function desktopRootKind(onboardingComplete: boolean, mainCreated: boolean) {
  return onboardingComplete || mainCreated ? 'main' : 'onboarding';
}

export function describeWindow(
  windows: ReadonlyMap<WindowKind, BrowserWindow>,
  kind: WindowKind,
  mode: SizeMode,
  rootKind: WindowKind
): WindowState {
  if (kind === 'settings') kind = 'main';
  if (kind === 'main' && !windows.has('main')) kind = rootKind;
  const window = windows.get(kind);

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
