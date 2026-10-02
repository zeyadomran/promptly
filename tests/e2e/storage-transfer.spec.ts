import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { backupSchema } from '../../src/shared/contracts/backup/format';
import { launchSettingsUiFixture, resizeSettings } from './settings-ui-fixture';

test('owned Storage UI exports, validates, cancels, imports and clears durably with keyboard focus', async () => {
  const owned = await launchSettingsUiFixture(false, undefined, true);
  let { application, settings } = owned;
  const text = 'Full owned text\u0000😀\n```embedded```\n' + 'large '.repeat(300);

  try {
    const created = await settings.evaluate(
      (value) => window.promptly.createSnippet({ text: value }),
      text
    );

    expect(created.ok).toBe(true);
    await settings.getByRole('tab', { name: 'Storage' }).click();
    await settings.getByRole('button', { name: 'JSON', exact: true }).click();
    await expect(settings.getByRole('status')).toContainText('export.json exported');
    const bytes = await readFile(path.join(owned.profile, 'export.json'));
    const backup = backupSchema.parse(JSON.parse(bytes.toString('utf8')));

    expect(backup.snippets.map((item) => item.text)).toEqual([text]);
    expect(bytes.toString()).not.toContain('sourceApp');
    await settings.getByRole('button', { name: 'Markdown', exact: true }).click();
    await expect(settings.getByRole('status')).toContainText('export.md exported');
    expect(await readFile(path.join(owned.profile, 'export.md'), 'utf8')).toContain(text);
    const launch = settings.getByRole('button', { name: 'Import JSON…' });

    await launch.click();
    const dialog = settings.getByRole('dialog', { name: 'Import library' });

    await expect(dialog).toContainText('Snippet IDs remapped');
    await resizeSettings(application, 440);
    await dialog.screenshot({
      path: test.info().outputPath('import-preview-440.png'),
      scale: 'css'
    });
    await settings.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(launch).toBeFocused();
    await writeFile(path.join(owned.profile, 'invalid.json'), '{invalid JSON');
    await application.evaluate(({ app }) => app.emit('owned-transfer-choice', 'invalid'));
    await launch.click();
    await expect(settings.getByRole('alert')).toContainText(
      'Invalid or unsupported Promptly backup'
    );
    await application.evaluate(({ app }) => app.emit('owned-transfer-choice', 'cancel'));
    await launch.click();
    await expect(settings.getByRole('status')).toContainText('Import canceled');
    await application.evaluate(({ app }) => app.emit('owned-transfer-choice', 'valid'));
    await launch.click();
    await dialog.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(launch).toBeFocused();
    const imported = await settings.evaluate(() =>
      window.promptly.searchSnippets({
        query: '',
        tagIds: [],
        untagged: false,
        sort: 'newest',
        offset: 0,
        limit: 50
      })
    );

    expect(imported).toMatchObject({ ok: true, value: { items: [{ text }, { text }] } });
    await settings.getByRole('button', { name: 'Clear all…' }).click();
    const clearing = settings.getByRole('dialog', { name: 'Clear all library data?' });
    const input = clearing.getByRole('textbox');
    const destructive = clearing.getByRole('button', { name: 'Clear library', exact: true });

    await input.fill('clear all');
    await expect(destructive).toBeDisabled();
    await input.fill('CLEAR ALL');
    await clearing.screenshot({
      path: test.info().outputPath('clear-confirmation-440.png'),
      scale: 'css'
    });
    await destructive.click();
    await expect(clearing).not.toBeVisible();
    await expect(settings.getByRole('status')).toContainText('Preferences were kept');
    ({ application, settings } = await owned.restart());
    expect(
      await settings.evaluate(() =>
        window.promptly.searchSnippets({
          query: '',
          tagIds: [],
          untagged: false,
          sort: 'newest',
          offset: 0,
          limit: 50
        })
      )
    ).toMatchObject({ ok: true, value: { items: [] } });
    await settings.getByRole('tab', { name: 'Storage' }).click();
    await settings.getByRole('button', { name: 'Import JSON…' }).click();
    await settings.getByRole('dialog').getByRole('button', { name: 'Import', exact: true }).click();
    await expect(settings.getByRole('dialog')).not.toBeVisible();
    ({ application, settings } = await owned.restart());
    expect(
      await settings.evaluate(() =>
        window.promptly.searchSnippets({
          query: '',
          tagIds: [],
          untagged: false,
          sort: 'newest',
          offset: 0,
          limit: 50
        })
      )
    ).toMatchObject({ ok: true, value: { items: [{ text }] } });
    await settings.getByRole('tab', { name: 'Storage' }).click();
    await resizeSettings(application, 900);
    await settings.screenshot({
      path: test.info().outputPath('storage-light-900.png'),
      scale: 'css'
    });
    expect(
      await settings.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
  } finally {
    await owned.dispose();
  }
});
