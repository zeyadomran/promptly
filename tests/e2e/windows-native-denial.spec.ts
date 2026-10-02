import { execFile, spawn } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { expect, test } from '@playwright/test';

import { NativeProcess } from '../../src/main/platform/native/native-process';
import {
  nativeCaptureSchema,
  nativeReadySchema
} from '../../src/shared/contracts/native-selection';
import { saveNativeReceipt } from './native-receipt';
import { windowsFixture } from './windows-fixture';

test('native provider failures map exactly independently of the production capture deadline', async () => {
  test.skip(process.platform !== 'win32', 'Windows provider errors are platform-specific');
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
  const executable = path.resolve(
    'out',
    `Promptly-win32-${process.arch}`,
    'resources',
    'promptly-windows.exe'
  );
  const transport = new NativeProcess({
    launch: () => spawn(executable, [], { windowsHide: true, stdio: 'pipe' })
  });
  const evidence: object[] = [];
  let completed = false;

  try {
    await transport.request('capabilities', {}, (value) => nativeReadySchema.parse(value), 5000);
    for (const [mode, expected] of [
      ['denied', 'permissionDenied'],
      ['error', 'providerError']
    ] as const) {
      const fixture = await windowsFixture(mode);

      try {
        const started = performance.now();
        // This test-only 5s budget verifies native classification, not timely production capture.
        const result = await transport.request(
          'capture',
          { expectedPid: fixture.fixturePid, includeText: true },
          (value) => nativeCaptureSchema.parse(value),
          5000
        );

        evidence.push({
          fixture: mode,
          status: result.status,
          deadlineMs: 5000,
          nativeMs: 'elapsedMs' in result ? result.elapsedMs : null,
          roundTripMs: performance.now() - started,
          ownedFixtureIntegrityLevel: fixture.integrityLevel
        });
        expect(result.status).toBe(expected);
        expect('text' in result).toBe(false);
      } finally {
        await fixture.close();
      }
    }

    completed = true;
  } finally {
    try {
      await saveNativeReceipt('windows-provider-failure-receipt', { completed, evidence });
    } finally {
      await transport.dispose();
    }
  }
});
