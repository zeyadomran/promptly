// @vitest-environment node
import { fileURLToPath } from 'node:url';

import { expect, it } from 'vitest';

import { openHelper } from '../../experiments/native-capture/protocol-client.mjs';

const fixture = fileURLToPath(new URL('./experiment-startup-fixture.mjs', import.meta.url));

it('allows bounded delayed startup beyond the ordinary request deadline', async () => {
  const helper = openHelper(process.execPath, [fixture, '2100'], {
    startupDeadlineMs: 3500,
    requestDeadlineMs: 200
  });

  try {
    expect((await helper.request('capabilities')).status).toBe('ok');
    expect(helper.startupReceipt).toMatchObject({ phase: 'startup', status: 'ready' });
    expect(helper.startupReceipt.elapsedMs).toBeGreaterThan(2000);
    expect((await helper.request('capture')).status).toBe('ok');
    await helper.close();
  } finally {
    helper.kill();
  }
});

it('kills startup that never becomes ready and settles close after exit', async () => {
  const helper = openHelper(process.execPath, [fixture, '5000'], { startupDeadlineMs: 80 });

  await expect(helper.ready()).rejects.toThrow('"phase":"startup","status":"timedOut"');
  await helper.close();
  expect(helper.startupReceipt.elapsedMs).toBeGreaterThanOrEqual(80);
});

it('keeps the ordinary request deadline after delayed readiness', async () => {
  const helper = openHelper(process.execPath, [fixture, '100', 'hang'], {
    startupDeadlineMs: 1000,
    requestDeadlineMs: 40
  });

  await helper.ready();
  const before = performance.now();

  await expect(helper.request('capture')).rejects.toThrow('"phase":"request","status":"timedOut"');
  expect(performance.now() - before).toBeLessThan(500);
  await helper.close();
});

it('records early exit codes and startup elapsed without raw output', async () => {
  const helper = openHelper(process.execPath, [
    '-e',
    'process.stderr.write("private");process.exit(7)'
  ]);

  await expect(helper.ready()).rejects.toThrow('"exitCode":7');
  await helper.close();
  expect(helper.startupReceipt).toMatchObject({ status: 'exited', exitCode: 7, stderrBytes: 7 });
  expect(JSON.stringify(helper.startupReceipt)).not.toContain('private');
});
