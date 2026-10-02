import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { backupSchema } from '../../src/shared/contracts/backup/format';
import { launchOwnedTransferPackage } from './storage-packaged-fixture';

test('packaged production transfer commits and restores through the actual main, preload and worker', async () => {
  const owned = await launchOwnedTransferPackage();
  const failures: unknown[] = [];

  try {
    let application = owned.application;
    let page = await application.firstWindow();
    const text = 'Packaged full text\u0000😀\n' + 'unchopped '.repeat(200);

    const created = await page.evaluate(
      (value) => window.promptly.createSnippet({ text: value }),
      text
    );

    if (!created.ok) throw new Error('Creation failed');
    const tag = await page.evaluate(() =>
      window.promptly.createTag({ name: 'owned', color: 'blue' })
    );

    if (!tag.ok) throw new Error('Tag creation failed');
    expect(
      await page.evaluate(
        ({ id, tagId }) => window.promptly.setSnippetTags({ id, tagIds: [tagId] }),
        { id: created.value.snippet.id, tagId: tag.value.tag.id }
      )
    ).toMatchObject({ ok: true });
    expect(
      await page.evaluate(
        ({ id, text: value }) => window.promptly.updateSnippet({ id, text: value }),
        {
          id: created.value.snippet.id,
          text: text + 'edited'
        }
      )
    ).toMatchObject({ ok: true });
    expect(
      await page.evaluate(
        (id) => window.promptly.duplicateSnippet({ id }),
        created.value.snippet.id
      )
    ).toMatchObject({ ok: true });
    const deleted = await page.evaluate(
      (id) => window.promptly.deleteSnippet({ id }),
      created.value.snippet.id
    );

    if (!deleted.ok) throw new Error('Delete failed');
    expect(
      await page.evaluate(
        (undoToken) => window.promptly.undoDeleteSnippet({ undoToken }),
        deleted.value.undoToken
      )
    ).toMatchObject({ ok: true });
    expect(
      await page.evaluate(() => window.promptly.openDesktopWindow({ kind: 'settings' }))
    ).toMatchObject({ ok: true });
    const settings = application.windows().find((item) => item.url().endsWith('#settings'));

    if (settings === undefined) throw new Error('Missing production Settings window.');
    await settings.getByRole('tab', { name: 'Storage' }).click();
    owned.stage('export');
    // Substitute only native chooser completion. Product owner checks, serialization, atomic write and IPC stay real.
    const filename = path.join(owned.profile, 'packaged-backup.json');

    await application.evaluate(({ dialog }, selected) => {
      dialog.showSaveDialog = () => Promise.resolve({ canceled: false, filePath: selected });
      dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [selected] });
    }, filename);
    await settings.getByRole('button', { name: 'JSON', exact: true }).click();
    await expect(settings.getByRole('status')).toContainText('packaged-backup.json exported');
    const bytes = await readFile(filename);

    expect(backupSchema.parse(JSON.parse(bytes.toString('utf8'))).snippets[0]?.text).toBe(
      text + 'edited'
    );
    await settings.getByRole('button', { name: 'Clear all…' }).click();
    owned.stage('typed-clear');
    await settings.getByRole('textbox', { name: 'Type CLEAR ALL to confirm' }).fill('clear all');
    await expect(
      settings.getByRole('dialog').getByRole('button', { name: 'Clear library', exact: true })
    ).toBeDisabled();
    await settings.getByRole('textbox', { name: 'Type CLEAR ALL to confirm' }).fill('CLEAR ALL');
    await settings
      .getByRole('dialog')
      .getByRole('button', { name: 'Clear library', exact: true })
      .click();
    await expect(settings.getByRole('dialog')).not.toBeVisible();
    await settings.getByRole('button', { name: 'Import JSON…' }).click();
    owned.stage('preview-and-import');
    await settings.getByRole('dialog').getByRole('button', { name: 'Import', exact: true }).click();
    await expect(settings.getByRole('dialog')).not.toBeVisible();
    await owned.restart();
    owned.stage('durable-restart');
    application = owned.application;
    page = await application.firstWindow();
    const library = await page.evaluate(() =>
      window.promptly.searchSnippets({
        query: '',
        tagIds: [],
        untagged: false,
        sort: 'newest',
        offset: 0,
        limit: 50
      })
    );

    expect(library).toMatchObject({
      ok: true,
      value: { items: [{ text: text + 'edited' }, { text: text + 'edited' }] }
    });
    const receipt = test.info().outputPath('packaged-transfer.json');
    const { writeFile } = await import('node:fs/promises');

    await writeFile(
      receipt,
      JSON.stringify({
        packaged: true,
        ownedProfile: true,
        chooserCompletion: 'substituted',
        restoredTextUnits: text.length,
        revision: library.ok ? library.value.revision : null
      })
    );
    await test
      .info()
      .attach('packaged-transfer', { path: receipt, contentType: 'application/json' });
    owned.stage('passed');
  } catch (error) {
    failures.push(error);
  } finally {
    try {
      await owned.dispose();
    } catch (cleanup) {
      failures.push(cleanup);
    }
  }

  if (failures.length > 0)
    throw new AggregateError(failures, 'Packaged transfer or restoration failed.', {
      cause: failures[0]
    });
});
