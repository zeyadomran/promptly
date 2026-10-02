import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { NativeProcess } from '../../src/main/platform/native/native-process';
import { macosCaptureSchema, macosReadySchema } from '../../src/shared/contracts/macos-selection';
import {
  nativeActivationSchema,
  selectionUnits
} from '../../src/shared/contracts/native-selection';
import { buildMacosFixture, macosFixture, macosResources } from './macos-fixture';

test.describe('packaged production macOS protocol', () => {
  test.skip(process.platform !== 'darwin', 'AX helper only ships on macOS');
  test.beforeAll(buildMacosFixture);
  test('strict guards and frame bounds operate on the actual packaged binary', async () => {
    test.setTimeout(120_000);
    const executable = path.join(macosResources(), 'promptly-macos');
    const transport = new NativeProcess({ launch: () => spawn(executable, [], { stdio: 'pipe' }) });
    const parse = (value: unknown) => nativeActivationSchema.parse(value);

    try {
      expect(
        (
          await transport.request(
            'capabilities',
            {},
            (value) => macosReadySchema.parse(value),
            5000
          )
        ).warmupReady
      ).toBe(true);
      for (const payload of [
        { expectedPid: null },
        { expectedPid: true },
        { expectedPid: '1' },
        { expectedPid: 1.5 },
        { expectedPid: 0 },
        { expectedPid: 2_147_483_648 },
        { includeText: null },
        { includeText: 1 },
        { includeText: 'true' },
        { identity: null },
        { identity: 'shell text' },
        { path: '/Applications/Terminal.app' }
      ]) {
        expect(
          (await transport.request('capture', { includeText: true, ...payload }, parse, 500)).status
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
        expect((await transport.request(command, {}, parse, 500)).status).toBe('invalidRequest');
      }

      expect(
        (await transport.request('activate', { identity: 'a'.repeat(32) }, parse, 500)).status
      ).toBe('foregroundChanged');
      expect(
        (
          await transport.request(
            'activate',
            { identity: 'a'.repeat(32), commandPath: '/bin/sh' },
            parse,
            500
          )
        ).status
      ).toBe('invalidRequest');
      expect(
        (
          await transport.request(
            'capture',
            { expectedPid: 2_147_483_647, includeText: true },
            parse,
            500
          )
        ).status
      ).toBe('foregroundChanged');
      for (const mode of ['max', 'oversized']) {
        const fixture = await macosFixture(mode);

        try {
          expect(fixture.foregroundMatched).toBe(true);
          // Long fixture-only frame deadline is distinct from 100 ms production selection.
          const result = await transport.request(
            'capture',
            { expectedPid: fixture.fixturePid, includeText: true },
            (value) => macosCaptureSchema.parse(value),
            5000
          );

          expect(result.status).toBe(mode === 'max' ? 'ok' : 'selectionTooLarge');
          if (result.status === 'ok') {
            expect(result.text).toBe('\u0001'.repeat(selectionUnits));
            expect(result.characterCount).toBe(selectionUnits);
          } else expect('text' in result).toBe(false);
        } finally {
          await fixture.close();
        }
      }
    } finally {
      await transport.dispose();
    }

    const child = spawn(executable, [], { stdio: 'pipe' });
    const ended = once(child, 'exit', { signal: AbortSignal.timeout(5000) });

    child.stdout.resume();
    child.stderr.resume();
    child.stdin.end();
    try {
      expect((await ended)[0]).toBe(0);
    } finally {
      child.kill();
    }

    const overlimit = spawn(executable, [], { stdio: 'pipe' });
    const rejected = once(overlimit, 'exit', { signal: AbortSignal.timeout(5000) });

    overlimit.stdout.resume();
    overlimit.stderr.resume();
    overlimit.stdin.on('error', () => undefined);
    overlimit.stdin.write('x'.repeat(4097));
    try {
      expect((await rejected)[0]).toBe(1);
    } finally {
      overlimit.kill();
    }
  });
});
