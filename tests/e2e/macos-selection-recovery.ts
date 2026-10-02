import { expect } from '@playwright/test';

import type { MacosSelection } from '../../src/main/platform/macos/macos-selection';
import { recordMacosCapture } from './macos-capture-receipt';
import { macosFixture } from './macos-fixture';

/** Preserve the existing one-shot recovery assertions, with failure evidence before each gate. */
export async function assertMacosSelectionRecovery(adapter: MacosSelection, evidence: object[]) {
  const first = await macosFixture('selected');

  try {
    let started = performance.now();
    const identity = await adapter.foregroundIdentityResult();

    evidence.push({
      phase: 'recovery-first-identity',
      status: identity.status,
      elapsedMs: performance.now() - started,
      ownedPidMatched:
        identity.status === 'ok' && identity.identity.source?.pid === first.fixturePid
    });
    const second = await macosFixture('empty');

    try {
      if (identity.status !== 'ok') throw new Error('Missing owned identity');
      started = performance.now();
      const staleCapture = await adapter.captureSelection(identity.identity);

      recordMacosCapture(evidence, 'recovery-old-identity-capture', started, staleCapture);
      expect(staleCapture.status).toBe('foregroundChanged');
      started = performance.now();
      await first.close();
      evidence.push({
        phase: 'recovery-first-close',
        status: 'closed',
        elapsedMs: performance.now() - started
      });
      started = performance.now();
      const activation = await adapter.activateSource(identity.identity);

      evidence.push({
        phase: 'recovery-stale-activation',
        status: activation,
        elapsedMs: performance.now() - started
      });
      expect(activation).toBe('foregroundChanged');
      started = performance.now();
      const next = await adapter.foregroundIdentityResult();
      const ownedPidMatched =
        next.status === 'ok' && next.identity.source?.pid === second.fixturePid;

      evidence.push({
        phase: 'recovery-fresh-identity',
        status: next.status,
        elapsedMs: performance.now() - started,
        ownedPidMatched
      });
      if (next.status !== 'ok') throw new Error('Missing recovery identity');
      expect(ownedPidMatched).toBe(true);
      started = performance.now();
      const capture = await adapter.captureSelection(next.identity);

      recordMacosCapture(evidence, 'recovery-fresh-capture', started, capture, { ownedPidMatched });
      expect(capture.status).toBe('empty');
    } finally {
      await second.close();
    }
  } finally {
    await first.close();
  }
}
