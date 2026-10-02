import path from 'node:path';

import { _electron as electron, expect, test } from '@playwright/test';

import { buildIpcFixture } from './build-ipc-fixture';
import type { HarnessGlobal } from './fixtures/harness-types';

test('real IPC rejects untrusted windows and frames, broadcasts once, and safely renders snippets', async () => {
  await buildIpcFixture();
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }

  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: [path.resolve('.vite/build/ipc-fixture.cjs')], env });

  try {
    await expect.poll(() => app.windows().length).toBe(2);
    const [first, second] = app.windows();

    if (first === undefined || second === undefined) throw new Error('Fixture windows missing.');
    await expect(first.locator('pre')).toHaveText('Initial fixture snippet');
    await expect(second.locator('pre')).toHaveText('Initial fixture snippet');
    await expect
      .poll(() =>
        app.evaluate(() => (globalThis as unknown as HarnessGlobal).p02Harness.subscriberCount())
      )
      .toBe(2);
    expect(
      await app.evaluate(() =>
        (globalThis as unknown as HarnessGlobal).p02Harness.rejectChildFrame()
      )
    ).toBe(true);
    const payload = '<script>window.xss = true</script><img src=x onerror="window.xss=true">';

    expect(
      await first.evaluate((text) => window.promptly.createSnippet({ text }), payload)
    ).toMatchObject({ ok: true });
    for (const page of [first, second]) {
      await expect(page.locator('pre')).toHaveText(payload);
      expect(
        await page.evaluate(() => ({
          events: window.fixtureEvents,
          markup: document.querySelector('pre script, pre img'),
          executed: 'xss' in window
        }))
      ).toEqual({ events: [1], markup: null, executed: false });
    }

    await second.reload();
    await expect(second.locator('pre')).toHaveText(payload);
    await expect
      .poll(() =>
        app.evaluate(() => (globalThis as unknown as HarnessGlobal).p02Harness.subscriberCount())
      )
      .toBe(2);
    await first.evaluate(() => window.promptly.createSnippet({ text: 'After reload' }));
    await expect(second.locator('pre')).toHaveText('After reload');
    expect(
      await second.evaluate(() => window.fixtureEvents.filter((revision) => revision === 2))
    ).toEqual([2]);
    await second.close();
    await expect
      .poll(() =>
        app.evaluate(() => (globalThis as unknown as HarnessGlobal).p02Harness.subscriberCount())
      )
      .toBe(1);
    await app.evaluate(() => (globalThis as unknown as HarnessGlobal).p02Harness.openUntrusted());
    const untrusted = app.windows().find((page) => page !== first);

    if (untrusted === undefined) throw new Error('Untrusted fixture missing.');
    expect(
      await untrusted.evaluate(() => window.promptly.createSnippet({ text: 'Denied' }))
    ).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
    await expect(first.locator('pre')).toHaveText('After reload');
    await first.evaluate(() => {
      window.fixtureStop();
      window.fixtureStop();
    });
    await expect
      .poll(() =>
        app.evaluate(() => (globalThis as unknown as HarnessGlobal).p02Harness.subscriberCount())
      )
      .toBe(0);
  } finally {
    await app.close();
  }
});
