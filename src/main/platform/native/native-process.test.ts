import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';

import { expect, it } from 'vitest';

import { nativeActivationSchema } from '../../../shared/contracts/native-selection';
import { NativeProcess } from './native-process';

it('retires the owned helper when a provider request exceeds its deadline', async () => {
  const child = spawn(process.execPath, [path.resolve('tests/fixtures/native-transport.mjs')], {
    stdio: 'pipe',
    windowsHide: true
  });
  const exited = once(child, 'exit');
  const transport = new NativeProcess({ launch: () => child });

  try {
    await expect(
      transport.request('capture', {}, (value) => nativeActivationSchema.parse(value), 500)
    ).rejects.toMatchObject({ status: 'timedOut' });
    await exited;
    expect(child.killed).toBe(true);
  } finally {
    await transport.dispose();
  }

  await expect(
    transport.request('capture', {}, (value) => nativeActivationSchema.parse(value), 100)
  ).rejects.toMatchObject({ status: 'disposed' });
});
