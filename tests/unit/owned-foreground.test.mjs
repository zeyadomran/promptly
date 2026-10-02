// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';

import { waitOwnedForeground } from '../e2e/owned-foreground';

const owned = { token: 'a'.repeat(32), source: { pid: 7, name: 'fixture', id: 'fixture.exe' } };

afterEach(() => {
  vi.useRealTimers();
});

it('waits for owned identity readiness after a transient foreground timeout', async () => {
  const read = vi
    .fn()
    .mockResolvedValueOnce({ status: 'timedOut' })
    .mockResolvedValue({ status: 'ok', identity: owned });
  const observe = vi.fn();

  expect(
    await waitOwnedForeground(read, async (identity) => identity === owned, observe, 1000)
  ).toBe(owned);
  expect(observe.mock.calls.map(([value]) => value.status)).toEqual(['timedOut', 'ok']);
});

it('rejects unrelated identity and bounds pending startup without publishing late readiness', async () => {
  vi.useFakeTimers();
  let complete;
  const pending = new Promise((resolve) => {
    complete = resolve;
  });
  const read = vi
    .fn()
    .mockResolvedValueOnce({ status: 'ok', identity: owned })
    .mockReturnValue(pending);
  const observe = vi.fn();
  const result = waitOwnedForeground(read, async () => false, observe, 100);
  const rejected = expect(result).rejects.toThrow('Owned foreground readiness timed out');

  await vi.advanceTimersByTimeAsync(100);
  await rejected;
  expect(observe).toHaveBeenCalledOnce();
  expect(observe.mock.calls[0][0]).toMatchObject({ owned: false });
  complete({ status: 'ok', identity: owned });
  await vi.advanceTimersByTimeAsync(0);
  expect(observe).toHaveBeenCalledOnce();
});
