import { expect, it, vi } from 'vitest';

import { closeWindowResources } from './close-window-resources';

it('drains final window settings commits before preference and database cleanup', async () => {
  let complete: (() => void) | undefined;
  const accepted = new Promise<void>((resolve) => {
    complete = resolve;
  });
  const remaining = vi.fn(() => Promise.resolve());
  const closing = closeWindowResources({ close: () => accepted }, remaining);

  await Promise.resolve();
  expect(remaining).not.toHaveBeenCalled();
  complete?.();
  await closing;
  expect(remaining).toHaveBeenCalledOnce();
});

it('still closes remaining resources after geometry failure and preserves both recovery errors', async () => {
  const geometryError = new Error('Position commit failed.');
  const databaseError = new Error('Storage recovery required.');
  const remaining = vi.fn(() => Promise.reject(databaseError));
  let failure: unknown;

  try {
    await closeWindowResources(
      {
        close: () => {
          throw geometryError;
        }
      },
      remaining
    );
  } catch (error) {
    failure = error;
  }

  expect(remaining).toHaveBeenCalledOnce();
  expect(failure).toBeInstanceOf(AggregateError);
  if (!(failure instanceof AggregateError)) throw new Error('Missing aggregate failure.');
  expect(failure.errors).toEqual([geometryError, databaseError]);
});
