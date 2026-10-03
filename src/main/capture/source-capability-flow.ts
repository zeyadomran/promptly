import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';

import { WindowsSelection } from '../platform/windows/windows-selection';
import { CaptureSources } from './sources';

export async function assertSourceCapabilityLifetime(): Promise<void> {
  const children: ReturnType<typeof spawn>[] = [];
  const exits: Promise<unknown>[] = [];
  const native = new WindowsSelection({
    launch: () => {
      const child = spawn(
        process.execPath,
        [path.resolve('tests/fixtures/selection-transport.mjs')],
        {
          stdio: 'pipe',
          windowsHide: true
        }
      );

      children.push(child);
      exits.push(once(child, 'exit'));
      return child;
    }
  });
  const sources = new CaptureSources(native);

  try {
    const identity = await native.foregroundIdentity();

    assert.ok(identity);
    sources.remember('saved', identity);
    assert.equal(await sources.available('saved'), true);
    for (let index = 0; index < 32; index++) assert.ok(await native.foregroundIdentity());
    assert.equal(await sources.available('saved'), false);
    assert.equal((await sources.activate('saved')).ok, false);
    const live = await native.foregroundIdentity();

    assert.ok(live);
    sources.remember('live', live);
    assert.equal(await sources.available('live'), true);
    children.at(-1)?.stdin?.end();
    await exits.at(-1);
    assert.equal(await sources.available('live'), false);
    assert.equal(children.length, 1);
    assert.ok(await native.foregroundIdentity());
    assert.equal(await native.sourceAvailable(live), false);
    assert.equal(await native.activateSource(live), 'foregroundChanged');
    assert.equal(await native.sourceAvailable({ ...live }), false);
  } finally {
    await native.dispose();
    await Promise.all(exits);
  }
}
