import { describe, expect, it, vi } from 'vitest';

import { operations, subscribeChannel, unsubscribeChannel } from '../shared/contracts/operations';
import { createDesktopBridge } from './create-desktop-bridge';

function setup() {
  const invoke = vi.fn().mockResolvedValue({ ok: true, value: { revision: 0 } });
  const listeners = new Set<(value: unknown) => void>();
  const remove = vi.fn();
  const listen = vi.fn((listener: (value: unknown) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      remove();
    };
  });
  const desktop = createDesktopBridge({ invoke, listen }, 'win32');

  return { ...desktop, invoke, listen, listeners, remove };
}

describe('preload allowlist and lifecycle', () => {
  it('exposes only fixed named operations and validates before IPC', async () => {
    const { bridge, invoke } = setup();

    expect(Object.isFrozen(bridge)).toBe(true);
    expect(Object.keys(bridge).sort()).toEqual(
      ['platform', 'subscribeChanges', ...Object.keys(operations)].sort()
    );
    expect(await bridge.getSnippet({ id: 'not-an-id' })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_REQUEST' }
    });
    expect(invoke).not.toHaveBeenCalled();
    invoke.mockResolvedValue({ ok: true, value: { revision: 1, tags: [] } });
    await bridge.listTags({});
    expect(invoke).toHaveBeenCalledWith('promptly:listTags', {});
  });
  it('shares one native listener, validates events, and unsubscribes exactly once', async () => {
    const { bridge, listen, listeners, remove, invoke, dispose } = setup();
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = bridge.subscribeChanges(first);
    const stopSecond = bridge.subscribeChanges(second);

    await Promise.resolve();
    expect(listen).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(subscribeChannel, {});
    first.mockClear();
    second.mockClear();
    for (const listener of listeners) {
      listener({ revision: 1, domains: ['snippets'] });
      listener({ revision: -1, domains: ['snippets'] });
    }

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    stopFirst();
    stopFirst();
    expect(remove).not.toHaveBeenCalled();
    stopSecond();
    stopSecond();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls.filter(([channel]) => channel === unsubscribeChannel)).toHaveLength(1);
    dispose();
    expect(await bridge.listTags({})).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
  });
  it('ignores late handshakes after disposal and rejects malformed responses', async () => {
    const { bridge, invoke, dispose } = setup();
    let reply: ((value: unknown) => void) | undefined;

    invoke.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          reply = resolve;
        })
    );
    const listener = vi.fn();

    bridge.subscribeChanges(listener);
    dispose();
    reply?.({ ok: true, value: { revision: 9 } });
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
    const other = setup();

    other.invoke.mockResolvedValue({
      ok: true,
      value: { revision: 0, tags: [], shell: 'execute' }
    });
    expect(await other.bridge.listTags({})).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL' }
    });
  });
});
