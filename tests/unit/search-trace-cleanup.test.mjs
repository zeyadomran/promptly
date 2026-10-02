import { expect, it, vi } from 'vitest';

import { settleSearchCleanup } from '../e2e/search-trace';

it('flushes before app close and profile removal, including early assertion teardown', async () => {
  const order = [];

  await settleSearchCleanup([
    async () => {
      order.push('flush');
    },
    async () => {
      order.push('close');
    },
    async () => {
      order.push('remove');
    }
  ]);
  expect(order).toEqual(['flush', 'close', 'remove']);
});

it('reports cleanup failures without replacing an existing ordinary gate failure', async () => {
  const report = vi.spyOn(console, 'error').mockImplementation(() => {});

  try {
    await expect(
      settleSearchCleanup([() => Promise.reject(new Error('Flush failed'))], true)
    ).resolves.toBeUndefined();
    expect(report).toHaveBeenCalledOnce();
  } finally {
    report.mockRestore();
  }
});

it('settles application/profile cleanup even when trace flushing and close both fail', async () => {
  const removed = vi.fn().mockResolvedValue(undefined);
  const traceError = new Error('Trace flush failed');
  const closeError = new Error('Application close failed');

  await expect(
    settleSearchCleanup([
      () => Promise.reject(traceError),
      () => Promise.reject(closeError),
      removed
    ])
  ).rejects.toMatchObject({ errors: [traceError, closeError] });
  expect(removed).toHaveBeenCalledOnce();
});
