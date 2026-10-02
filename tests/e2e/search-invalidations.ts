import type { ElectronApplication, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export async function measureSearchInvalidations(application: ElectronApplication, page: Page) {
  const input = page.getByRole('textbox', { name: 'Search' });
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
  await expect(
    page.getByRole('complementary', { name: 'Selected full text' }).locator('pre')
  ).toHaveText('fresh captured fixture');
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
      await expect(
        page.getByRole('complementary', { name: 'Selected full text' }).locator('pre')
      ).toHaveText('needle-9999 changed');
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

  return invalidations;
}
