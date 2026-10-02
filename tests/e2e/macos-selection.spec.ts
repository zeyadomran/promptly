import { expect, test } from '@playwright/test';

import { createMacosSelection } from '../../src/main/platform/macos/macos-selection';
import { buildMacosFixture, macosFixture, macosResources } from './macos-fixture';
import { saveNativeReceipt } from './native-receipt';

test('macOS captures an ordinary owned selection and returns to its saved source', async () => {
  test.skip(process.platform !== 'darwin', 'macOS platform flow');
  await buildMacosFixture();
  const adapter = createMacosSelection({
    resourcesPath: macosResources(),
    packaged: true,
    applicationPath: 'unused'
  });
  const evidence: object[] = [];
  let completed = false;

  try {
    expect((await adapter.ready()).warmupReady).toBe(true);
    const source = await macosFixture('selected');

    try {
      const recorded = await adapter.foregroundIdentityResult();

      evidence.push({
        phase: 'source-identity',
        status: recorded.status,
        ownedPidMatched:
          recorded.status === 'ok' && recorded.identity.source?.pid === source.fixturePid
      });
      expect(recorded.status).toBe('ok');
      if (recorded.status !== 'ok') throw new Error('Missing owned source identity');
      expect(recorded.identity.source?.pid).toBe(source.fixturePid);
      const before = await source.inspect();
      const started = performance.now();
      const result = await adapter.captureSelection(recorded.identity);

      evidence.push({
        phase: 'capture',
        status: result.status,
        elapsedMs: performance.now() - started
      });
      expect(result.status).toBe('ok');
      if (result.status === 'ok')
        expect(result.text).toBe('  Promptly \u96ea\u{1f642}\r\n"fixture"\t\u0000end  ');
      expect(await source.inspect()).toEqual(before);
      const other = await macosFixture('empty');

      try {
        const foreground = await adapter.foregroundIdentityResult();

        expect(
          foreground.status === 'ok' && foreground.identity.source?.pid === other.fixturePid
        ).toBe(true);
        const activation = await adapter.activateSource(recorded.identity);

        evidence.push({ phase: 'source-handoff', status: activation });
        expect(activation).toBe('ok');
        expect(await source.isForeground(source.fixturePid)).toMatchObject({
          matched: true,
          launchDateAvailable: true
        });
      } finally {
        await other.close();
      }

      completed = true;
    } finally {
      await source.close();
    }
  } finally {
    try {
      await saveNativeReceipt('macos-selection-receipt', {
        completed,
        evidence,
        scope: 'ordinary-owned-capture-and-source-handoff'
      });
    } finally {
      await adapter.dispose();
    }
  }
});
