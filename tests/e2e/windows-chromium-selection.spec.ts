import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { _electron as electron, expect, test } from '@playwright/test';

import { createWindowsSelection } from '../../src/main/platform/windows/windows-selection';
import { saveNativeReceipt } from './native-receipt';
import { waitOwnedForeground } from './owned-foreground';
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
  const evidence: object[] = [];
  const started = performance.now();
  let completed = false;

  try {
    const page = await browser.firstWindow();

    await expect(page.getByRole('textbox')).toBeFocused();
    const ready = await adapter.ready();

    evidence.push({
      phase: 'helper-ready',
      warmupMs: ready.warmupMs,
      startupMs: ready.startupMs,
      elapsedMs: performance.now() - started
    });
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
    const identity = await waitOwnedForeground(
      () => adapter.foregroundIdentityResult(),
      async (candidate) => {
        const ownedPids = await browser.evaluate(({ app }) => [
          process.pid,
          ...app.getAppMetrics().map((entry) => entry.pid)
        ]);

        return candidate.source !== null && ownedPids.includes(candidate.source.pid);
      },
      (observation) => {
        evidence.push({ phase: 'foreground-readiness', ...observation });
      }
    );
    // Startup may poll identity, but selected text is requested exactly once after ownership.
    const captureStarted = performance.now();
    const result = await adapter.captureSelection(identity);

    evidence.push({
      phase: 'capture',
      status: result.status,
      deadlineMs: 100,
      nativeMs: 'elapsedMs' in result ? result.elapsedMs : null,
      elapsedMs: performance.now() - captureStarted
    });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.text).toBe('Chromium 雪🙂 exact\nowned fixture');
    completed = true;
  } finally {
    try {
      await saveNativeReceipt('windows-chromium-receipt', {
        completed,
        elapsedMs: performance.now() - started,
        evidence
      });
    } finally {
      await adapter.dispose();
      await foregroundDriver?.close();
      await browser.close();
    }
  }
});
