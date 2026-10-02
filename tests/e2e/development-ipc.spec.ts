import path from 'node:path';

import type { ElectronApplication } from '@playwright/test';
import { _electron as electron, expect, test } from '@playwright/test';
import { createServer } from 'vite';

import { buildIpcFixture } from './build-ipc-fixture';
import type { HarnessGlobal } from './fixtures/harness-types';

test('Forge raw development URL authorizes real main-frame operations and subscriptions', async () => {
  const server = await createServer({
    configFile: false,
    root: path.resolve('tests/e2e/fixtures'),
    server: { host: '127.0.0.1', port: 0, hmr: false, fs: { allow: [process.cwd()] } }
  });
  let app: ElectronApplication | undefined;

  try {
    await server.listen();
    const address = server.httpServer?.address();

    if (address == null || typeof address === 'string')
      throw new Error('Development server address missing.');
    // Forge 8 emits the origin without '/', while Chromium's mainFrame.url includes it.
    const rawForgeUrl = `http://127.0.0.1:${String(address.port)}`;

    await buildIpcFixture(rawForgeUrl);
    const env: Record<string, string> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) env[key] = value;
    }

    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({ args: [path.resolve('.vite/build/ipc-fixture.cjs')], env });
    const page = await app.firstWindow();

    await expect(page.locator('pre')).toHaveText('Initial fixture snippet');
    expect(page.url()).toBe(`${rawForgeUrl}/`);
    expect(await page.evaluate(() => window.promptly.listTags({}))).toMatchObject({
      ok: false,
      error: { code: 'UNAVAILABLE' }
    });
    await expect
      .poll(() =>
        app?.evaluate(() =>
          'p02Harness' in globalThis
            ? (globalThis as unknown as HarnessGlobal).p02Harness.subscriberCount()
            : 0
        )
      )
      .toBe(2);
    for (const window of app.windows())
      await expect(window.locator('pre')).toHaveText('Initial fixture snippet');
    expect(
      await page.evaluate(() => window.promptly.createSnippet({ text: 'Development IPC works' }))
    ).toMatchObject({ ok: true });
    for (const window of app.windows())
      await expect(window.locator('pre')).toHaveText('Development IPC works');
  } finally {
    await app?.close();
    await server.close();
  }
});
