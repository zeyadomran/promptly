// @vitest-environment node
import { expect, it, vi } from 'vitest';

import { OwnedPreviews } from './previews';

it('expires the actual owner-bound preview, removes listeners and discards the worker plan', async () => {
  vi.useFakeTimers();
  const discard = vi.fn(() => Promise.resolve());
  const stop = vi.fn();
  const previews = new OwnedPreviews(discard);
  const owner = { id: 1, isAlive: () => true, onClose: () => stop };

  try {
    previews.remember('owned-token', owner);
    expect(previews.belongsTo('owned-token', { ...owner, id: 2 })).toBe(false);
    expect(previews.belongsTo('owned-token', owner)).toBe(true);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(previews.belongsTo('owned-token', owner)).toBe(false);
    expect(discard).toHaveBeenCalledExactlyOnceWith('owned-token');
    expect(stop).toHaveBeenCalledOnce();
    await previews.clear();
  } finally {
    vi.useRealTimers();
  }
});
