import { BrowserWindow, type WebContents, webContents } from 'electron';

import { onboardingChannel } from '../../shared/contracts/onboarding';
import type { DesktopOperations } from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import type { CaptureService } from '../capture/service';
import type { SettingsService } from '../settings/service';
import type { Shortcuts } from '../shortcuts/service';
import type { TransferOwner } from '../storage/transfer/requests';
import type { WindowLifecycle } from '../windows/window-lifecycle';
import { OnboardingCoordinator } from './coordinator';
import type { OnboardingOwner } from './ports';

/** Tutorial authority belongs to one live native window/document, never a renderer-supplied PID. */
export function desktopOnboarding(
  capture: CaptureService,
  settings: SettingsService,
  ownerFor: (id: number) => TransferOwner | undefined,
  lifecycle: () => WindowLifecycle | undefined,
  shortcuts: Shortcuts
) {
  const coordinator = new OnboardingCoordinator(settings, {
    now: () => performance.now(),
    startTest: (id, publish) => {
      shortcuts.startTest(id, publish);
    },
    stopTest: (id) => {
      shortcuts.stopTest(id);
    },
    complete: async (id, destination) => {
      const manager = lifecycle();

      if (manager === undefined) throw new Error('Window lifecycle unavailable.');
      if (destination === 'wiki') await manager.showWiki();
      else await manager.show();
      const contents = webContents.fromId(id);

      if (contents?.getURL().endsWith('#onboarding') === true)
        BrowserWindow.fromWebContents(contents)?.close();
    }
  });
  const unsubscribe = capture.subscribe((event) => {
    coordinator.observeCapture(event);
  });
  const owner = (contents: WebContents): OnboardingOwner | undefined => {
    if (contents.isDestroyed() || !contents.getURL().endsWith('#onboarding')) return undefined;
    const window = BrowserWindow.fromWebContents(contents);
    const lifetime = ownerFor(contents.id);

    if (window === null || window.isDestroyed() || lifetime === undefined) return undefined;
    const handle = window.getNativeWindowHandle();

    if (handle.length !== 8) return undefined;
    return {
      id: contents.id,
      windowHandle: handle.readBigUInt64LE().toString(16).padStart(16, '0'),
      alive: lifetime.isAlive,
      onClose: lifetime.onClose,
      publish: (state) => {
        contents.send(onboardingChannel, state);
      }
    };
  };

  return {
    services: (contents: WebContents): Partial<DesktopOperations> => {
      const current = owner(contents);
      const unavailable = () => failure('UNAUTHORIZED', 'This is not a live tutorial window.');

      return {
        getOnboardingState: () =>
          Promise.resolve(current === undefined ? unavailable() : coordinator.state(current)),
        setOnboardingStep: ({ step }) =>
          Promise.resolve(current === undefined ? unavailable() : coordinator.step(current, step)),
        finishOnboarding: ({ skip, destination }) =>
          current === undefined
            ? Promise.resolve(unavailable())
            : coordinator.finish(current, skip, destination)
      };
    },
    close: async () => {
      unsubscribe();
      await coordinator.close();
    }
  };
}
