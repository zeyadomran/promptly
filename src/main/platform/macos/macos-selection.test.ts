import { spawn } from 'node:child_process';
import path from 'node:path';

import { expect, it } from 'vitest';

import { MacosSelection } from './macos-selection';

it('rejects forged and retired source identity capabilities', async () => {
  const adapter = new MacosSelection({
    launch: () =>
      spawn(process.execPath, [path.resolve('tests/fixtures/macos-adapter.mjs')], {
        stdio: 'pipe',
        windowsHide: true
      })
  });

  try {
    await adapter.ready();
    const recorded = await adapter.foregroundIdentityResult();

    if (recorded.status !== 'ok') throw new Error('Missing owned fixture identity');
    expect(await adapter.activateSource({ ...recorded.identity })).toBe('foregroundChanged');
    expect((await adapter.captureSelection({ ...recorded.identity })).status).toBe(
      'foregroundChanged'
    );
    await adapter.dispose();
    expect(await adapter.activateSource(recorded.identity)).toBe('disposed');
    expect((await adapter.captureSelection(recorded.identity)).status).toBe('disposed');
  } finally {
    await adapter.dispose();
  }
});
