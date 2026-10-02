import { spawn } from 'node:child_process';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { NativeProcess } from '../../src/main/platform/native/native-process';
import {
  nativeActivationSchema,
  nativeReadySchema
} from '../../src/shared/contracts/native-selection';
test.describe('packaged production Windows protocol', () => {
  test.skip(process.platform !== 'win32', 'Windows UIA helper is not shipped on macOS');
  test('production binary rejects malformed options and all spike-only commands', async () => {
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
      for (const payload of [
        { expectedPid: null },
        { expectedPid: true },
        { expectedPid: '1' },
        { expectedPid: 1.5 },
        { expectedPid: 0 },
        { expectedPid: 2_147_483_648 },
        { includeText: null },
        { includeText: 1 },
        { includeText: 'true' }
      ]) {
        expect(
          (
            await transport.request(
              'capture',
              payload,
              (value) => nativeActivationSchema.parse(value),
              500
            )
          ).status
        ).toBe('invalidRequest');
      }

      for (const command of [
        'fixturePayload',
        'fixtureStats',
        'fixtureOptions',
        'hookStart',
        'fallback',
        'clipboardMetadata'
      ]) {
        expect(
          (
            await transport.request(
              command,
              {},
              (value) => nativeActivationSchema.parse(value),
              500
            )
          ).status
        ).toBe('invalidRequest');
      }

      expect(
        (
          await transport.request(
            'capture',
            { expectedPid: 2_147_483_647, includeText: true },
            (value) => nativeActivationSchema.parse(value),
            500
          )
        ).status
      ).toBe('foregroundChanged');
    } finally {
      await transport.dispose();
    }
  });
});
