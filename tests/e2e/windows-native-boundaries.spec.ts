import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { promisify } from 'node:util';

import { expect, test } from '@playwright/test';

import { NativeProcess } from '../../src/main/platform/native/native-process';
import {
  nativeCaptureSchema,
  nativeReadySchema,
  selectionUnits
} from '../../src/shared/contracts/native-selection';
import { windowsFixture } from './windows-fixture';

test('packaged native full escaped payload bounds and clean EOF', async () => {
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
  const executable = path.resolve(
    'out',
    `Promptly-win32-${process.arch}`,
    'resources',
    'promptly-windows.exe'
  );
  const transport = new NativeProcess({
    launch: () => spawn(executable, [], { windowsHide: true, stdio: 'pipe' })
  });

  try {
    await transport.request('capabilities', {}, (value) => nativeReadySchema.parse(value), 5000);
    for (const mode of ['max', 'oversized']) {
      const fixture = await windowsFixture(mode);

      try {
        // Longer fixture-only deadline verifies framing, separately from the production 100ms budget.
        const result = await transport.request(
          'capture',
          { expectedPid: fixture.fixturePid, includeText: true },
          (value) => nativeCaptureSchema.parse(value),
          5000
        );

        expect(result.status).toBe(mode === 'max' ? 'ok' : 'selectionTooLarge');
        if (result.status === 'ok') {
          expect(result.characterCount).toBe(selectionUnits);
          expect(result.text).toBe('\u0001'.repeat(selectionUnits));
        } else expect('text' in result).toBe(false);
      } finally {
        await fixture.close();
      }
    }
  } finally {
    await transport.dispose();
  }

  const eofChild = spawn(executable, [], { windowsHide: true, stdio: 'pipe' });
  const ended = once(eofChild, 'exit', { signal: AbortSignal.timeout(5000) });

  eofChild.stdout.resume();
  eofChild.stderr.resume();
  eofChild.stdin.end();
  try {
    expect((await ended)[0]).toBe(0);
  } finally {
    eofChild.kill();
  }
});
