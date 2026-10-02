// @vitest-environment node
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { nativeActivationSchema } from '../../../shared/contracts/native-selection';
import { NativeProcess } from './native-process';

const fixture = path.resolve('tests/fixtures/native-transport.mjs');
const parse = (value: unknown) => nativeActivationSchema.parse(value);

function setup(modes: string[]) {
  const children: ChildProcessWithoutNullStreams[] = [];
  const transport = new NativeProcess({
    launch: () => {
      const mode = modes.shift() ?? 'ok';
      const child = spawn(process.execPath, [fixture, mode], { stdio: 'pipe', windowsHide: true });

      children.push(child);
      return child;
    }
  });

  return { transport, children };
}

describe('isolated native lifecycle', () => {
  it('waits for graceful quit, then kills a helper that refuses EOF', async () => {
    const { transport, children } = setup(['block-eof']);

    await transport.request('capabilities', {}, parse, 1500);
    const shutdown = transport.dispose();

    expect(transport.dispose()).toBe(shutdown);
    await shutdown;
    expect(children[0]?.killed).toBe(true);
    await expect(transport.request('capture', {}, parse, 100)).rejects.toMatchObject({
      status: 'disposed'
    });
  });
  it('drops a result whose validation crosses its absolute deadline', async () => {
    const { transport } = setup(['ok']);

    try {
      await expect(
        transport.request(
          'capture',
          {},
          (value) => {
            const blockedUntil = performance.now() + 600;

            while (performance.now() < blockedUntil) {
              /* Model expensive schema validation. */
            }

            return parse(value);
          },
          500
        )
      ).rejects.toMatchObject({ status: 'timedOut' });
    } finally {
      await transport.dispose();
    }
  });
  it('kills a blocked call, rejects queued calls, then starts a fresh helper', async () => {
    const { transport, children } = setup(['hang', 'old']);

    try {
      const first = transport.request('capture', {}, parse, 500);
      const queued = transport.request('capture', {}, parse, 1500);
      const rejected = Promise.all([
        expect(first).rejects.toMatchObject({ status: 'timedOut' }),
        expect(queued).rejects.toMatchObject({ status: 'timedOut' })
      ]);
      const original = children[0];

      if (original === undefined) throw new Error('Missing child');
      const exited = once(original, 'exit');

      await rejected;
      await exited;
      expect(original.killed).toBe(true);
      expect(await transport.request('capture', {}, parse, 1500)).toMatchObject({
        status: 'ok',
        id: '3'
      });
      expect(children).toHaveLength(2);
    } finally {
      await transport.dispose();
    }
  });

  it.each(['crash', 'partial', 'invalid', 'oversized'])(
    'fails closed on %s and recovers',
    async (mode) => {
      const { transport } = setup([mode, 'ok']);

      try {
        await expect(transport.request('capture', {}, parse, 2000)).rejects.toMatchObject({
          status: 'helperUnavailable'
        });
        expect(await transport.request('capture', {}, parse, 1500)).toMatchObject({ status: 'ok' });
      } finally {
        await transport.dispose();
      }
    }
  );

  it('bounds queue and request bytes, and disposal rejects all work', async () => {
    const { transport } = setup(['hang']);
    const pending = Array.from({ length: 4 }, () => transport.request('capture', {}, parse, 2000));
    const rejects = Promise.all(
      pending.map((request) => expect(request).rejects.toMatchObject({ status: 'disposed' }))
    );

    await expect(transport.request('capture', {}, parse, 2000)).rejects.toMatchObject({
      status: 'busy'
    });
    await transport.dispose();
    await transport.dispose();
    await rejects;
    await expect(transport.request('capture', {}, parse, 100)).rejects.toMatchObject({
      status: 'disposed'
    });
    const next = setup(['ok']);

    await expect(
      next.transport.request('capture', { oversized: 'x'.repeat(4096) }, parse, 100)
    ).rejects.toMatchObject({ status: 'busy' });
    expect(next.children).toHaveLength(0);
    await next.transport.dispose();
  });
});
