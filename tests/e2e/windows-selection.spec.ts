import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { expect, test } from '@playwright/test';

import type { WindowsIdentity } from '../../src/main/platform/windows/windows-selection';
import { createWindowsSelection } from '../../src/main/platform/windows/windows-selection';
import { saveNativeReceipt } from './native-receipt';
import { windowsFixture } from './windows-fixture';

test.describe('packaged production Windows selection', () => {
  test.skip(process.platform !== 'win32', 'Windows UIA helper is not shipped on macOS');

  test.beforeAll(async () => {
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
  });

  test('exact owned selections, protected/unsupported controls, races and timeout recovery', async () => {
    test.setTimeout(120_000);
    const resourcesPath = path.resolve('out', `Promptly-win32-${process.arch}`, 'resources');
    const adapter = createWindowsSelection({
      resourcesPath,
      packaged: true,
      applicationPath: 'unused'
    });
    const launchedAt = performance.now();
    const evidence: object[] = [];
    let ready: Awaited<ReturnType<typeof adapter.ready>> | undefined;
    let readyRoundTripMs: number | null = null;
    let completed = false;

    try {
      ready = await adapter.ready();
      readyRoundTripMs = performance.now() - launchedAt;
      let retiredIdentity: WindowsIdentity | undefined;

      expect(ready.warmupReady).toBe(true);
      for (const [mode, expectedStatus, expectedText] of [
        ['selected', 'ok', '  Promptly 雪🙂\r\n"fixture"\tend  '],
        ['disjoint', 'ok', 'first 雪\n🙂\r\nsecond'],
        ['empty', 'empty', undefined],
        ['password', 'secureInput', undefined],
        ['unsupported', 'unsupported', undefined],
        ['changed', 'foregroundChanged', undefined],
        ['slow', 'timedOut', undefined],
        ['denied-slow', 'timedOut', undefined]
      ] as const) {
        const fixture = await windowsFixture(mode);

        try {
          const identity = await adapter.foregroundIdentity();

          expect(identity?.source?.pid, `Owned ${mode} fixture must own foreground`).toBe(
            fixture.fixturePid
          );
          if (identity === null) throw new Error('Missing fixture identity');
          if (expectedStatus === 'timedOut') retiredIdentity = identity;
          const started = performance.now();
          const result = await adapter.captureSelection(identity);

          evidence.push({
            fixture: mode,
            ownedFixtureIntegrityLevel: fixture.integrityLevel,
            targetIntegrityLevel:
              'targetIntegrityLevel' in result ? result.targetIntegrityLevel : null,
            status: result.status,
            deadlineMs: 100,
            nativeMs: 'elapsedMs' in result ? result.elapsedMs : null,
            roundTripMs: performance.now() - started
          });
          expect(result.status, mode).toBe(expectedStatus);
          if (result.status === 'ok') expect(result.text).toBe(expectedText);
          else expect('text' in result).toBe(false);
          if (expectedStatus === 'timedOut') {
            expect(performance.now() - started).toBeGreaterThanOrEqual(90);
            expect(performance.now() - started).toBeLessThan(500);
          }

          if (mode === 'selected') {
            const durations: number[] = [];
            const nativeDurations: number[] = [];

            for (let sample = 0; sample < 9; sample++) {
              const before = performance.now();
              const warm = await adapter.captureSelection(identity);

              expect(warm.status).toBe('ok');
              if (warm.status === 'ok') {
                expect(warm.text).toBe(expectedText);
                nativeDurations.push(warm.elapsedMs);
              }

              durations.push(performance.now() - before);
            }

            evidence.push({
              fixture: 'selected-warm',
              samples: 9,
              maxRoundTripMs: Math.max(...durations),
              maxNativeMs: Math.max(...nativeDurations)
            });
          }
        } finally {
          await fixture.close();
        }
      }

      // The blocked process was killed; readiness and a fresh owned selection must recover.
      expect((await adapter.ready()).warmupReady).toBe(true);
      if (retiredIdentity === undefined) throw new Error('Missing retired fixture identity');
      expect((await adapter.captureSelection(retiredIdentity)).status).toBe('foregroundChanged');
      const recoveryFixture = await windowsFixture('selected');

      try {
        const identity = await adapter.foregroundIdentity();

        expect(identity?.source?.pid).toBe(recoveryFixture.fixturePid);
        if (identity === null) throw new Error('Missing recovery identity');
        expect((await adapter.captureSelection(identity)).status).toBe('ok');
        expect(await adapter.activateSource({ ...identity })).toBe('foregroundChanged');
        expect(await adapter.activateSource(identity)).toBe('ok');
      } finally {
        await recoveryFixture.close();
      }

      completed = true;
    } finally {
      try {
        await saveNativeReceipt('windows-selection-receipt', {
          platform: process.platform,
          completed,
          helperIntegrityLevel: ready?.integrityLevel ?? null,
          warmupMs: ready?.warmupMs ?? null,
          helperStartupMs: ready?.startupMs ?? null,
          processToReadyMs: readyRoundTripMs,
          elapsedMs: performance.now() - launchedAt,
          evidence
        });
      } finally {
        await adapter.dispose();
      }
    }
  });
});
