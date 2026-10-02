import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { cpus, tmpdir, totalmem } from 'node:os';
import path from 'node:path';

import { _electron as electron, expect, test } from '@playwright/test';

import { buildIpcFixture } from './build-ipc-fixture';
import { seedSearchCorpus } from './search-corpus';
import { summarizeSearchSamples } from './search-statistics';

test('10k input-to-painted React results via named IPC and the packaged worker', async ({
  browserName
}, testInfo) => {
  test.setTimeout(120_000);
  await buildIpcFixture(undefined, 'tests/e2e/fixtures/search-main.ts', 'search');
  const directory = await mkdtemp(path.join(tmpdir(), 'promptly-search-'));
  const filename = path.join(directory, 'search.sqlite');
  const corpus = seedSearchCorpus(filename);
  const packaged = path.resolve('out', `Promptly-${process.platform}-${process.arch}`);
  const asar =
    process.platform === 'darwin'
      ? path.join(packaged, 'Promptly.app/Contents/Resources/app.asar')
      : path.join(packaged, 'resources/app.asar');
  const env: Record<string, string> = {
    PROMPTLY_SEARCH_DATABASE: filename,
    PROMPTLY_SEARCH_WORKER: path.join(asar, '.vite/build/storage-worker.cjs')
  };

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }

  delete env.ELECTRON_RUN_AS_NODE;
  const application = await electron.launch({
    args: [path.resolve('.vite/build/ipc-fixture.cjs')],
    env
  });
  const consoleMessages: string[] = [];

  application.process().stdout?.on('data', (data: Buffer) => {
    consoleMessages.push(data.toString());
  });
  try {
    const page = await application.firstWindow();

    await expect(page.getByTestId('ready')).toHaveText('0');
    await expect(page.getByTestId('total')).toHaveText('10000');
    const cases = [
      'i',
      're',
      'review',
      'e',
      'needle-9999',
      'no-match-zzzz',
      '你好',
      '(x)*',
      '"%b_c"',
      'from:terminal review'
    ];
    const samples: Record<string, number[]> = {};
    const phases: Record<
      string,
      { bridge: number; worker: number; reactCommit: number; frameWait: number }[]
    > = {};
    const input = page.getByRole('textbox', { name: 'Search' });

    for (let pass = 0; pass < 11; pass += 1) {
      for (const query of cases) {
        await input.fill(query);
        await expect(page.getByTestId('paint')).toHaveAttribute('data-query', query);
        const duration = Number(await page.getByTestId('paint').textContent());

        (samples[query] ??= []).push(duration);
        (phases[query] ??= []).push({
          bridge: Number(await page.getByTestId('paint').getAttribute('data-bridge-ms')),
          worker: Number(await page.getByTestId('paint').getAttribute('data-worker-ms')),
          reactCommit: Number(await page.getByTestId('paint').getAttribute('data-commit-ms')),
          frameWait: Number(await page.getByTestId('paint').getAttribute('data-paint-wait-ms'))
        });
        if (query === 'no-match-zzzz') await expect(page.getByTestId('total')).toHaveText('0');
        if (query === 'needle-9999') await expect(page.getByTestId('total')).toHaveText('1');
        if (query === '你好') await expect(page.getByTestId('total')).toHaveText('104');
        if (query === 'from:terminal review')
          await expect(page.getByTestId('total')).toHaveText('5000');
      }
    }

    await input.fill('');
    await expect(page.getByTestId('paint')).toHaveAttribute('data-query', '');
    await input.pressSequentially('needle-9999', { delay: 1 });
    await expect(page.getByTestId('paint')).toHaveAttribute('data-query', 'needle-9999');
    const rapid = Number(await page.getByTestId('paint').textContent());

    await expect(page.getByTestId('total')).toHaveText('1');
    const invalidations: Record<string, number> = {};

    await application.evaluate(
      ({ app }) =>
        new Promise<void>((resolve) => {
          app.emit('search-fixture:capture', resolve);
        })
    );
    await expect(page.getByTestId('paint')).toHaveAttribute('data-revision', '1');
    invalidations['capture'] = Number(await page.getByTestId('paint').textContent());
    await input.fill('"fresh captured"');
    await expect(page.getByTestId('paint')).toHaveAttribute('data-query', '"fresh captured"');
    await expect(page.getByTestId('total')).toHaveText('1');
    await expect(page.getByRole('complementary', { name: 'Selected full text' })).toHaveText(
      'fresh captured fixture'
    );
    await input.fill('needle-9999');
    await expect(page.getByTestId('paint')).toHaveAttribute('data-query', 'needle-9999');
    for (const mutation of ['edit', 'tag', 'delete'] as const) {
      const previousRevision = Number(await page.getByTestId('ready').textContent());

      await page.evaluate(async (operation) => {
        const id = '00000000-0000-4000-8000-000000009999';

        if (operation === 'edit')
          await window.promptly.updateSnippet({ id, text: 'needle-9999 changed' });
        if (operation === 'tag') {
          const tag = await window.promptly.createTag({ name: 'search-fixture' });

          if (tag.ok) await window.promptly.setSnippetTags({ id, tagIds: [tag.value.tag.id] });
        }

        if (operation === 'delete') await window.promptly.deleteSnippet({ id });
      }, mutation);
      await expect(page.getByTestId('paint')).toHaveAttribute(
        'data-revision',
        String(previousRevision + (mutation === 'tag' ? 2 : 1))
      );
      invalidations[mutation] = Number(await page.getByTestId('paint').textContent());
      if (mutation === 'edit')
        await expect(page.getByRole('complementary', { name: 'Selected full text' })).toHaveText(
          'needle-9999 changed'
        );
      if (mutation === 'tag') {
        await input.fill('tag:search-fixture from:cursor needle-9999');
        await expect(page.getByTestId('paint')).toHaveAttribute(
          'data-query',
          'tag:search-fixture from:cursor needle-9999'
        );
        await expect(page.getByTestId('total')).toHaveText('1');
      }

      if (mutation === 'delete') await expect(page.getByTestId('total')).toHaveText('0');
    }

    const statistics = summarizeSearchSamples(samples);
    const evidence = {
      browserName,
      hardware: {
        platform: process.platform,
        cpu: cpus()[0]?.model,
        logicalCpus: cpus().length,
        memoryBytes: totalmem()
      },
      runtime: consoleMessages,
      corpus,
      measurement:
        'native input event timestamp to second animation frame after real React result commit; conservative paint upper bound; 20 list previews (160 UTF-16 chars) plus ONE selected full-text preview/page; full text transmitted/searched/highlighted; no timed debounce',
      statistics,
      phases,
      rapid,
      invalidations
    };
    const evidencePath = testInfo.outputPath('search-benchmark.json');

    await writeFile(evidencePath, JSON.stringify(evidence, null, 2));
    await testInfo.attach('search-benchmark', {
      path: evidencePath,
      contentType: 'application/json'
    });
    console.log(JSON.stringify(evidence));
    // Emit truthful evidence before enforcing the complete-path performance gate.
    expect(
      Math.max(
        rapid,
        ...Object.values(invalidations),
        ...Object.values(statistics).map((stats) => stats.max)
      )
    ).toBeLessThan(50);
  } finally {
    await application.close();
    await rm(directory, { recursive: true, force: true });
  }
});
