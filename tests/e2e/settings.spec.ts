import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { _electron as electron, expect, test } from '@playwright/test';

import { buildIpcFixture } from './build-ipc-fixture';

test('settings converge across three live renderers, roll back native failure and reopen before paint', async () => {
  await buildIpcFixture(undefined, 'tests/e2e/fixtures/settings-main.ts', true);
  const directory = await mkdtemp(path.join(tmpdir(), 'promptly-settings-ipc-'));
  const env: Record<string, string> = {
    PROMPTLY_SETTINGS_FIXTURE_DATABASE: path.join(directory, 'settings.sqlite')
  };

  for (const [key, value] of Object.entries(process.env))
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  let application = await electron.launch({
    args: [path.resolve('.vite/build/ipc-fixture.cjs')],
    env
  });

  try {
    await expect.poll(() => application.windows().length).toBe(3);
    const first = application.windows()[0];

    if (first === undefined) throw new Error('Missing settings fixture window.');
    for (const page of application.windows())
      await expect(page.getByRole('heading', { name: 'Promptly' })).toBeVisible();
    expect(
      await first.evaluate(() => window.promptly.updateSettings({ doubleTapWindowMs: 601 }))
    ).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
    expect(
      await first.evaluate(() =>
        window.promptly.updateSettings({ theme: 'dark', alwaysOnTop: true, doubleTapWindowMs: 150 })
      )
    ).toMatchObject({ ok: true, value: { revision: 1 } });
    for (const page of application.windows()) {
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(9, 9, 11)');
      expect(await page.evaluate(() => window.promptly.getSettings({}))).toMatchObject({
        ok: true,
        value: { revision: 1, settings: { alwaysOnTop: true, doubleTapWindowMs: 150 } }
      });
    }

    expect(
      await application.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().every((window) => window.isAlwaysOnTop())
      )
    ).toBe(true);
    expect(
      await first.evaluate(() =>
        window.promptly.updateSettings({
          theme: 'light',
          alwaysOnTop: false,
          onboardingComplete: true
        })
      )
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(await first.evaluate(() => window.promptly.getSettings({}))).toMatchObject({
      ok: true,
      value: {
        revision: 1,
        settings: { theme: 'dark', alwaysOnTop: true, onboardingComplete: false }
      }
    });
    expect(
      await application.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().every((window) => window.isAlwaysOnTop())
      )
    ).toBe(true);
    for (const page of application.windows())
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(
      await first.evaluate(() => window.promptly.updateSettings({ showInTray: false }))
    ).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    await first.reload();
    await expect(first.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await first.evaluate(() => window.promptlyInitialSettings)).toMatchObject({
      revision: 1,
      settings: { theme: 'dark', alwaysOnTop: true }
    });
    const before = await first.evaluate(() => window.promptly.getSettings({}));

    await application.close();
    application = await electron.launch({
      args: [path.resolve('.vite/build/ipc-fixture.cjs')],
      env
    });
    await expect.poll(() => application.windows().length).toBe(3);
    for (const page of application.windows()) {
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      expect(await page.evaluate(() => window.promptlyInitialSettings)).toMatchObject({
        revision: 1,
        settings: { theme: 'dark', alwaysOnTop: true }
      });
      expect(await page.evaluate(() => window.promptly.getSettings({}))).toEqual(before);
    }
  } finally {
    await application.close();
    await rm(directory, { recursive: true, force: true });
  }
});
