import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';

import { WindowsSelection } from '../platform/windows/windows-selection';
import { PreviousAppService } from './service';

/** Real adapter and generation authority; only the external Windows provider is controlled. */
export async function assertPreviousAppNativeLifetime(): Promise<void> {
  const children: ReturnType<typeof spawn>[] = [];
  const exits: Promise<unknown>[] = [];
  let visible = true;
  let grant: 'denied' | 'error' | 'allowed' = 'denied';
  const native = new WindowsSelection({
    allowForeground: (pid: number) => {
      assert.equal(pid, children.at(-1)?.pid);
      if (grant === 'error') throw new Error('Owned foreground grant failure');
      return grant === 'allowed';
    },
    launch: () => {
      const child = spawn(
        process.execPath,
        [path.resolve('tests/fixtures/selection-transport.mjs')],
        { stdio: 'pipe', windowsHide: true }
      );

      children.push(child);
      exits.push(once(child, 'exit'));
      return child;
    }
  });
  const previous = new PreviousAppService({
    native,
    ownPid: 7,
    alwaysOnTop: () => false,
    hide: () => {
      visible = false;
    }
  });

  try {
    await native.ready();
    await previous.captureBeforeShow();
    await previous.captureAfterFocus();
    assert.deepEqual(await previous.getPreviousApp(), {
      state: 'available',
      label: 'Owned provider'
    });
    assert.deepEqual(await previous.returnToPreviousApp(), {
      returned: 'denied',
      label: 'Owned provider'
    });
    assert.equal(visible, true);
    grant = 'error';
    assert.deepEqual(await previous.returnToPreviousApp(), {
      returned: 'denied',
      label: 'Owned provider'
    });
    assert.deepEqual(await previous.getPreviousApp(), {
      state: 'available',
      label: 'Owned provider'
    });
    grant = 'allowed';
    assert.deepEqual(await previous.returnToPreviousApp(), {
      returned: 'returned',
      label: 'Owned provider'
    });
    assert.equal(visible, false);
    visible = true;
    // Exactly fill the helper's bounded cache to retire the earlier issued target.
    for (let index = 0; index < 32; index++) assert.ok(await native.foregroundIdentity());
    assert.deepEqual(await previous.returnToPreviousApp(), {
      returned: 'unavailable',
      label: 'Owned provider'
    });
    assert.equal(visible, true);
    await previous.captureBeforeShow();
    children.at(-1)?.stdin?.end();
    await exits.at(-1);
    assert.deepEqual(await previous.getPreviousApp(), { state: 'none' });
    assert.deepEqual(await previous.returnToPreviousApp(), {
      returned: 'unavailable',
      label: 'Owned provider'
    });
    assert.equal(children.length, 1);
    await native.ready();
    await previous.captureAfterFocus();
    assert.deepEqual(await previous.getPreviousApp(), { state: 'none' });
    assert.deepEqual(await previous.returnToPreviousApp(), {
      returned: 'unavailable'
    });
    await previous.captureBeforeShow();
    assert.deepEqual(await previous.returnToPreviousApp(), {
      returned: 'returned',
      label: 'Owned provider'
    });
    assert.equal(visible, false);
  } finally {
    previous.close();
    await native.dispose();
    await Promise.all(exits);
  }
}
