import assert from 'node:assert/strict';

import { PreviousAppService } from '../previous-app/service';
import type { WindowLifecycle } from './window-lifecycle';
import { ControlledWindow } from './window-test-fixture';

export function previousAppWindowFixture(hide: () => void) {
  const initialWindows = ControlledWindow.instances.length;
  let capturedBeforeCreation = false;
  const previous = new PreviousAppService({
    ownPid: 7,
    native: {
      foregroundIdentityResult: () => {
        capturedBeforeCreation ||= ControlledWindow.instances.length === initialWindows;
        return Promise.resolve({
          status: 'ok',
          identity: {
            token: 'a'.repeat(32),
            source: { pid: 42, name: 'Owned terminal', id: 'Owned.exe' }
          }
        });
      },
      sourceAvailable: () => Promise.resolve(true),
      activateSource: () => Promise.resolve('ok')
    },
    alwaysOnTop: () => false,
    hide
  });

  return {
    previous,
    assertCaptured: async () => {
      assert.equal(capturedBeforeCreation, true);
      assert.deepEqual(await previous.getPreviousApp(), {
        state: 'available',
        label: 'Owned terminal'
      });
    }
  };
}

export async function assertComposeRouting(lifecycle: WindowLifecycle, window: ControlledWindow) {
  const state = await lifecycle.services.getWindowState({});

  await lifecycle.dispatchCommand({ command: 'compose', destination: 'queue' });
  assert.deepEqual(window.webContents.sent.at(-1), {
    channel: 'promptly:shell-command',
    payload: { command: 'compose', destination: 'queue' }
  });
  assert.deepEqual(await lifecycle.services.getWindowState({}), state);
  await lifecycle.dispatchCommand({ command: 'copy', id: '00000000-0000-4000-8000-000000000042' });
  assert.deepEqual(window.webContents.sent.at(-1), {
    channel: 'promptly:shell-command',
    payload: { command: 'copy', id: '00000000-0000-4000-8000-000000000042' }
  });
  assert.deepEqual(await lifecycle.services.getWindowState({}), state);
}
