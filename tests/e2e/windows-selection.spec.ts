import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { expect, test } from '@playwright/test';

import { createWindowsSelection } from '../../src/main/platform/windows/windows-selection';
import { saveNativeReceipt } from './native-receipt';
import { windowsFixture } from './windows-fixture';

test('Windows captures an ordinary owned Unicode selection through the production helper', async () => {
  test.skip(process.platform !== 'win32', 'Windows platform flow');
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
  const adapter = createWindowsSelection({
    resourcesPath: path.resolve('out', `Promptly-win32-${process.arch}`, 'resources'),
    packaged: true,
    applicationPath: 'unused'
  });
  const evidence: object[] = [];
  let completed = false;

  try {
    expect((await adapter.ready()).warmupReady).toBe(true);
    const fixture = await windowsFixture('selected');

    try {
      const identity = await adapter.foregroundIdentity();

      evidence.push({
        phase: 'identity',
        ownedPidMatched: identity?.source?.pid === fixture.fixturePid
      });
      expect(identity?.source?.pid).toBe(fixture.fixturePid);
      if (identity === null) throw new Error('Missing owned identity');
      const before = performance.now();
      const result = await adapter.captureSelection(identity);

      evidence.push({
        phase: 'capture',
        status: result.status,
        elapsedMs: performance.now() - before
      });
      expect(result.status).toBe('ok');
      if (result.status === 'ok')
        expect(result.text).toBe('  Promptly \u96ea\u{1f642}\r\n"fixture"\tend  ');
      completed = true;
    } finally {
      await fixture.close();
    }
  } finally {
    try {
      await saveNativeReceipt('windows-selection-receipt', {
        completed,
        evidence,
        scope: 'ordinary-owned-functional-flow'
      });
    } finally {
      await adapter.dispose();
    }
  }
});
