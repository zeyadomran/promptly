// @vitest-environment node
import { spawn } from 'node:child_process';
import path from 'node:path';

import { expect, it } from 'vitest';

import { macosHelperPath, MacosSelection } from './macos-selection';

it('keeps opaque identity ownership, preserves exact text and rechecks permission revocation', async () => {
  const adapter = new MacosSelection({
    launch: () =>
      spawn(process.execPath, [path.resolve('tests/fixtures/macos-adapter.mjs')], {
        stdio: 'pipe',
        windowsHide: true
      })
  });

  try {
    expect((await adapter.ready()).platform).toBe('darwin');
    expect(await adapter.getPermissions()).toMatchObject({
      accessibility: 'granted',
      inputMonitoring: 'denied'
    });
    const recorded = await adapter.foregroundIdentityResult();

    if (recorded.status !== 'ok') throw new Error('Missing owned fixture identity');
    expect(Object.isFrozen(recorded.identity)).toBe(true);
    expect(Object.isFrozen(recorded.identity.source)).toBe(true);
    expect(await adapter.activateSource({ ...recorded.identity })).toBe('foregroundChanged');
    expect((await adapter.captureSelection({ ...recorded.identity })).status).toBe(
      'foregroundChanged'
    );
    expect(await adapter.captureSelection(recorded.identity)).toMatchObject({
      status: 'ok',
      text: ' 雪🙂\n\u0000 '
    });
    expect(await adapter.getPermissions()).toMatchObject({
      accessibility: 'denied',
      inputMonitoring: 'denied'
    });
    const denied = await adapter.captureSelection(recorded.identity);

    expect(denied.status).toBe('permissionDenied');
    expect('text' in denied).toBe(false);
  } finally {
    await adapter.dispose();
  }

  expect(await adapter.getPermissions()).toMatchObject({
    accessibility: 'unknown',
    inputMonitoring: 'unknown'
  });
});

it('resolves only fixed main-provided resource locations outside ASAR', () => {
  expect(
    macosHelperPath({
      packaged: true,
      resourcesPath: '/owned/Resources',
      applicationPath: '/unused'
    })
  ).toBe(path.join('/owned/Resources', 'promptly-macos'));
  expect(
    macosHelperPath({ packaged: false, resourcesPath: '/unused', applicationPath: '/owned/repo' })
  ).toBe(path.join('/owned/repo', 'native', 'macos', 'out', 'promptly-macos'));
});
