import { cpus, release } from 'node:os';

import { expect, test } from '@playwright/test';

import { createMacosSelection } from '../../src/main/platform/macos/macos-selection';
import { recordMacosCapture } from './macos-capture-receipt';
import { buildMacosFixture, macosFixture, macosResources } from './macos-fixture';
import { assertMacosSelectionRecovery } from './macos-selection-recovery';
import { saveNativeReceipt } from './native-receipt';

test.describe('packaged production macOS selection', () => {
  test.skip(process.platform !== 'darwin', 'AX helper only ships on macOS');
  test.beforeAll(buildMacosFixture);
  test('owned Unicode/NUL/multiline/disjoint capture, focus, permission states and recovery', async () => {
    test.setTimeout(120_000);
    const adapter = createMacosSelection({
      resourcesPath: macosResources(),
      packaged: true,
      applicationPath: 'unused'
    });
    const evidence: object[] = [];
    const started = performance.now();
    let completed = false;

    try {
      const ready = await adapter.ready();
      const processToReadyMs = performance.now() - started;
      const permissions = await adapter.getPermissions();

      evidence.push({ ready, processToReadyMs, permissions, hookInstalled: false });
      expect(ready.warmupReady).toBe(true);
      expect(permissions.accessibility).toBe('granted');
      expect(permissions.inputMonitoring).toMatch(/^(granted|denied)$/);
      for (const [mode, status, text] of [
        ['selected', 'ok', '  Promptly 雪🙂\r\n"fixture"\t\u0000end  '],
        ['disjoint', 'ok', 'first 雪🙂\r\nsecond'],
        ['whitespace', 'ok', ' \t\r\n '],
        ['empty', 'empty', undefined],
        ['password', 'secureInput', undefined],
        ['unsupported', 'unsupported', undefined],
        ['slow', 'timedOut', undefined]
      ] as const) {
        const fixture = await macosFixture(mode);

        try {
          expect(fixture.foregroundMatched).toBe(true);
          const identityResult = await adapter.foregroundIdentityResult();

          evidence.push({
            phase: 'matrix-identity',
            mode,
            status: identityResult.status,
            ownedPidMatched:
              identityResult.status === 'ok' &&
              identityResult.identity.source?.pid === fixture.fixturePid
          });
          expect(identityResult.status).toBe('ok');
          if (identityResult.status !== 'ok') throw new Error('Missing owned identity');
          const identity = identityResult.identity;

          expect(identity.source?.pid).toBe(fixture.fixturePid);
          expect(identity.source?.id).toBe('dev.promptly.owned-selection-fixture');
          const before = await fixture.inspect();
          const durations: number[] = [];
          const nativeDurations: number[] = [];

          for (let sample = 0; sample < (mode === 'selected' ? 10 : 1); sample++) {
            const captureStarted = performance.now();
            const result = await adapter.captureSelection(identity);

            recordMacosCapture(evidence, 'matrix-capture', captureStarted, result, {
              mode,
              sample,
              ownedPidMatched: identity.source?.pid === fixture.fixturePid
            });
            durations.push(performance.now() - captureStarted);
            expect(result.status, mode).toBe(status);
            if (result.status === 'ok') {
              expect(result.text).toBe(text);
              nativeDurations.push(result.elapsedMs);
            } else expect('text' in result).toBe(false);
          }

          evidence.push({
            mode,
            status,
            deadlineMs: 100,
            roundTripMs: durations,
            nativeMs: nativeDurations
          });
          if (mode !== 'slow') {
            const after = await fixture.inspect();

            expect(after).toEqual(before);
            expect(await adapter.activateSource({ ...identity })).toBe('foregroundChanged');
            expect(await adapter.activateSource(identity)).toBe('ok');
          } else {
            expect(durations[0]).toBeGreaterThanOrEqual(90);
            expect(durations[0]).toBeLessThan(500);
            expect((await adapter.ready()).warmupReady).toBe(true);
            expect((await adapter.captureSelection(identity)).status).toBe('foregroundChanged');
          }
        } finally {
          await fixture.close();
        }
      }

      await assertMacosSelectionRecovery(adapter, evidence);

      completed = true;
    } finally {
      await saveNativeReceipt('macos-selection-receipt', {
        completed,
        platform: process.platform,
        arch: process.arch,
        release: release(),
        cpu: cpus()[0]?.model,
        node: process.version,
        humanTccMatrix: false,
        endToEndToastLatencyMeasured: false,
        evidence
      });
      await adapter.dispose();
    }
  });
});
