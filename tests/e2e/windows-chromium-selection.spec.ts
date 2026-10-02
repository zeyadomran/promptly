import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { _electron as electron, expect, test } from '@playwright/test';

import { createWindowsSelection } from '../../src/main/platform/windows/windows-selection';
import { windowsFixture } from './windows-fixture';

test('packaged helper captures only the owned Chromium textarea', async () => {
  test.skip(process.platform !== 'win32', 'Windows UIA helper is not shipped on macOS');
  await promisify(execFile)(
    'powershell.exe',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      path.resolve('tests/native/windows/build.ps1')
    ],
    { windowsHide: true }
  );
  const environment = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );

  delete environment.ELECTRON_RUN_AS_NODE;
  const browser = await electron.launch({
    args: [path.resolve('tests/e2e/fixtures/chromium-selection.cjs')],
    env: environment
  });
  const adapter = createWindowsSelection({
    packaged: true,
    applicationPath: 'unused',
    resourcesPath: path.resolve('out', `Promptly-win32-${process.arch}`, 'resources')
  });
  let foregroundDriver: Awaited<ReturnType<typeof windowsFixture>> | undefined;

  try {
    const page = await browser.firstWindow();

    await expect(page.getByRole('textbox')).toBeFocused();
    await adapter.ready();
    const ownedWindow = await browser.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];

      if (window === undefined) throw new Error('Missing owned Chromium window');
      return {
        pid: process.pid,
        handle: window.getNativeWindowHandle().readBigUInt64LE().toString()
      };
    });

    foregroundDriver = await windowsFixture('focus-owned-chromium', [
      String(ownedWindow.pid),
      ownedWindow.handle
    ]);
    const identity = await adapter.foregroundIdentity();
    const ownedPids = await browser.evaluate(({ app }) => [
      process.pid,
      ...app.getAppMetrics().map((entry) => entry.pid)
    ]);

    expect(ownedPids).toContain(identity?.source?.pid);
    if (identity === null) throw new Error('Missing owned Chromium identity');
    const result = await adapter.captureSelection(identity);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.text).toBe('Chromium 雪🙂 exact\nowned fixture');
  } finally {
    await adapter.dispose();
    await foregroundDriver?.close();
    await browser.close();
  }
});
