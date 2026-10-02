import { rm, writeFile } from 'node:fs/promises';
import { cpus, totalmem } from 'node:os';

import { expect, test } from '@playwright/test';

import { assertProfileIdentity } from '../profile-identity';
import { launchSearchFixture } from './search-application';
import { assertCompleteHighlights } from './search-complete-highlights';
import { measureSearchInvalidations } from './search-invalidations';
import { startSearchProfiler } from './search-profiler';
import { summarizeSearchSamples } from './search-statistics';
import { finishSearchTrace, prepareSearchTrace, settleSearchCleanup } from './search-trace';
import { assertVisibleSearch } from './search-visibility';

test('10k input-to-painted React results via named IPC and the packaged worker', async ({
  browserName
}, testInfo) => {
  test.setTimeout(120_000);
  const { application, consoleMessages, corpus, directory, traceProfile } =
    await launchSearchFixture(testInfo);
  let traceFinished = false;
  let failed = false;
  let traceProfileIdentity: Awaited<ReturnType<typeof assertProfileIdentity>> | undefined;

  try {
    if (process.env['PROMPTLY_SEARCH_TRACE'] === '1') {
      const actual = await application.evaluate(({ app }) => app.getPath('userData'));

      traceProfileIdentity = await assertProfileIdentity(actual, traceProfile);
    }

    const page = await application.firstWindow();

    await prepareSearchTrace(page);
    const finishProfile = await startSearchProfiler(page, testInfo);

    await expect(page.getByTestId('ready')).toHaveText('0');
    await expect(page.getByTestId('total')).toHaveText('10000');
    const startup = await page.evaluate(async () => {
      const started = performance.now();

      await document.fonts.ready;
      return {
        fontReadyMs: performance.now() - started,
        uiFontLoaded: document.fonts.check('13px "Space Grotesk"'),
        textFontLoaded: document.fonts.check('13px "Geist Mono"')
      };
    });

    expect(startup.uiFontLoaded && startup.textFontLoaded).toBe(true);
    await expect
      .poll(() =>
        application.evaluate(({ BrowserWindow }) => {
          const window = BrowserWindow.getAllWindows()[0];

          return window?.isVisible() === true && window.isFocused();
        })
      )
      .toBe(true);
    const initialGeometry = await assertVisibleSearch(page, '');
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
      {
        bridge: number;
        worker: number;
        reactCommit: number;
        frameWait: number;
        validation: unknown;
      }[]
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
          frameWait: Number(await page.getByTestId('paint').getAttribute('data-paint-wait-ms')),
          validation: JSON.parse(
            (await page.getByTestId('paint').getAttribute('data-validation-ms')) ?? '{}'
          ) as unknown
        });
        if (query === 'no-match-zzzz') await expect(page.getByTestId('total')).toHaveText('0');
        if (query === 'needle-9999') await expect(page.getByTestId('total')).toHaveText('1');
        if (query === '你好') await expect(page.getByTestId('total')).toHaveText('104');
        if (query === 'from:terminal review')
          await expect(page.getByTestId('total')).toHaveText('5000');
        await assertVisibleSearch(page, query);
        if (pass === 0 && query === 'e') {
          const screenshotPath = testInfo.outputPath('visible-common-query.png');

          await page.screenshot({ path: screenshotPath });
          await testInfo.attach('visible-common-query', {
            path: screenshotPath,
            contentType: 'image/png'
          });
        }
      }

      if (pass === 1) {
        await finishSearchTrace(application, testInfo);
        traceFinished = true;
      }
    }

    await input.fill('');
    await expect(page.getByTestId('paint')).toHaveAttribute('data-query', '');
    await input.pressSequentially('needle-9999', { delay: 1 });
    await expect(page.getByTestId('paint')).toHaveAttribute('data-query', 'needle-9999');
    const rapid = Number(await page.getByTestId('paint').textContent());

    await expect(page.getByTestId('total')).toHaveText('1');
    const invalidations = await measureSearchInvalidations(application, page);
    const completeHighlightPaint = await assertCompleteHighlights(page);

    await finishProfile();

    const statistics = summarizeSearchSamples(samples);
    const evidence = {
      browserName,
      diagnosticProfile: process.env['PROMPTLY_SEARCH_PROFILE'] === '1',
      diagnosticTrace: process.env['PROMPTLY_SEARCH_TRACE'] === '1',
      traceProfileIdentity,
      hardware: {
        platform: process.platform,
        cpu: cpus()[0]?.model,
        logicalCpus: cpus().length,
        memoryBytes: totalmem()
      },
      runtime: consoleMessages,
      corpus,
      startup,
      initialGeometry,
      measurement:
        'native input event timestamp to second animation frame after real React result commit; conservative paint upper bound; simultaneously visible scrolling 20-row list and ONE wrapped full-text preview, actual bundled fonts; full text transmitted/searched/highlighted; no timed debounce or query prewarming',
      statistics,
      phases,
      rapid,
      completeHighlightPaint,
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
        completeHighlightPaint,
        ...Object.values(invalidations),
        ...Object.values(statistics).map((stats) => stats.max)
      )
    ).toBeLessThan(50);
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    await settleSearchCleanup(
      [
        async () => {
          if (!traceFinished) await finishSearchTrace(application, testInfo);
        },
        () => application.close(),
        () => rm(directory, { recursive: true, force: true })
      ],
      failed
    );
  }
});
