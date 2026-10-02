import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { _electron as electron, expect, test } from '@playwright/test';

import { buildIpcFixture } from './build-ipc-fixture';

test('real storage IPC publishes committed changes and reopens the authoritative handshake', async () => {
  await buildIpcFixture(undefined, 'tests/e2e/fixtures/storage-main.ts');
  const directory = await mkdtemp(path.join(tmpdir(), 'promptly-storage-ipc-'));
  const env: Record<string, string> = {
    PROMPTLY_STORAGE_FIXTURE_DATABASE: path.join(directory, 'database.sqlite')
  };

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }

  delete env.ELECTRON_RUN_AS_NODE;
  let application = await electron.launch({
    args: [path.resolve('.vite/build/ipc-fixture.cjs')],
    env
  });

  try {
    await expect.poll(() => application.windows().length).toBe(2);
    const [first, second] = application.windows();

    if (first === undefined || second === undefined) throw new Error('Missing fixture windows.');
    await expect(first.locator('pre')).toBeAttached();
    await expect(second.locator('pre')).toBeAttached();
    const created = await first.evaluate(() =>
      window.promptly.createSnippet({ text: 'persistent 👋\n<script>literal</script>' })
    );

    if (!created.ok) throw new Error(created.error.message);
    const id = created.value.snippet.id;

    await expect(second.locator('pre')).toHaveText(created.value.snippet.text);
    expect(await second.evaluate(() => window.fixtureEvents)).toEqual([1]);
    const tag = await first.evaluate(() =>
      window.promptly.createTag({ name: 'work', color: 'blue' })
    );

    if (!tag.ok) throw new Error(tag.error.message);
    expect(
      await first.evaluate(
        ({ snippetId, tagId }) =>
          window.promptly.setSnippetTags({ id: snippetId, tagIds: [tagId] }),
        { snippetId: id, tagId: tag.value.tag.id }
      )
    ).toMatchObject({ ok: true, value: { revision: 3 } });
    const conflict = await first.evaluate(() => window.promptly.createTag({ name: 'work' }));

    expect(conflict).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    expect(
      await first.evaluate(
        (snippetId) => window.promptly.copySnippet({ id: snippetId, format: 'text' }),
        id
      )
    ).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    expect(await first.evaluate(() => window.promptly.captureSelection({}))).toMatchObject({
      ok: false,
      error: { code: 'UNAVAILABLE' }
    });
    expect(await first.evaluate(() => window.promptly.getSettings({}))).toMatchObject({
      ok: false,
      error: { code: 'UNAVAILABLE' }
    });
    await expect.poll(() => second.evaluate(() => window.fixtureEvents)).toEqual([1, 2, 3]);
    const before = await first.evaluate(
      (snippetId) => window.promptly.getSnippet({ id: snippetId }),
      id
    );

    await application.close();
    application = await electron.launch({
      args: [path.resolve('.vite/build/ipc-fixture.cjs')],
      env
    });
    const reopened = await application.firstWindow();

    await expect(reopened.locator('pre')).toHaveText(created.value.snippet.text);
    expect(
      await reopened.evaluate((snippetId) => window.promptly.getSnippet({ id: snippetId }), id)
    ).toEqual(before);
    await expect.poll(() => reopened.evaluate(() => window.fixtureEvents)).toEqual([3]);
    const deleted = await reopened.evaluate(
      (snippetId) => window.promptly.deleteSnippet({ id: snippetId }),
      id
    );

    if (!deleted.ok) throw new Error(deleted.error.message);
    expect(deleted.value.revision).toBe(4);
    expect(
      await reopened.evaluate(
        (token) => window.promptly.undoDeleteSnippet({ undoToken: token }),
        deleted.value.undoToken
      )
    ).toMatchObject({ ok: true, value: { revision: 5, snippet: { id, tags: [tag.value.tag] } } });
  } finally {
    await application.close();
    await rm(directory, { recursive: true, force: true });
  }
});
