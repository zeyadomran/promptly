import type { ElectronApplication } from '@playwright/test';
import { expect } from '@playwright/test';

import type { macosFixture } from './macos-fixture';

export interface OwnedPromptlyForeground {
  appActive: boolean;
  windowFocused: boolean;
  windowVisible: boolean;
  fixtureForeground: boolean;
}

/** Test-only activation setup for the explicitly identified owned Promptly window. */
export async function establishOwnedPromptlyForeground(
  application: ElectronApplication,
  windowId: number,
  fixture: Pick<Awaited<ReturnType<typeof macosFixture>>, 'inspect'>,
  observe: (state: OwnedPromptlyForeground) => void
): Promise<void> {
  await application.evaluate(({ app, BrowserWindow }, id) => {
    const window = BrowserWindow.fromId(id);

    if (window === null) throw new Error('Missing owned Promptly window');
    app.focus({ steal: true });
    window.focus();
  }, windowId);
  await expect
    .poll(async () => {
      const window = await application.evaluate(({ app, BrowserWindow }, id) => {
        const owned = BrowserWindow.fromId(id);

        return {
          appActive: app.isActive(),
          windowFocused: owned?.isFocused() === true,
          windowVisible: owned?.isVisible() === true
        };
      }, windowId);
      const state = { ...window, fixtureForeground: (await fixture.inspect()).foregroundMatched };

      observe(state);
      return state;
    })
    .toEqual({
      appActive: true,
      windowFocused: true,
      windowVisible: true,
      fixtureForeground: false
    });
}
