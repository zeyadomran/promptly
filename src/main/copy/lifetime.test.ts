// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyFixture } from './copy-test-fixture';

function gate() {
  let release: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });

  return { promise, release };
}

describe('copy admission and irreversible-effect lifetime', () => {
  const fixtures: ReturnType<typeof copyFixture>[] = [];
  const gates: ReturnType<typeof gate>[] = [];
  const fixture = () => {
    const value = copyFixture({
      writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined),
      hide: vi.fn<() => Promise<boolean>>().mockResolvedValue(true)
    });

    fixtures.push(value);
    return { ...value, call: vi.spyOn(value.store.port, 'call') };
  };

  const block = () => {
    const value = gate();

    gates.push(value);
    return value;
  };

  afterEach(async () => {
    vi.useRealTimers();
    for (const value of gates.splice(0)) value.release();
    await Promise.all(fixtures.splice(0).map((value) => value.dispose()));
  });

  it('rejects an unowned request and simultaneous gestures without adding a second write', async () => {
    const value = fixture();
    const held = block();

    value.writeText.mockImplementation(() => held.promise);
    expect(
      await value.service.services.copySnippet({ id: value.id, format: 'text' })
    ).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' }
    });
    const first = value.copy();

    await vi.waitFor(() => {
      expect(value.writeText).toHaveBeenCalledTimes(1);
    });
    expect(await value.copy()).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    held.release();
    expect(await first).toMatchObject({ ok: true });
    expect(value.store.invoke('getSnippet', { id: value.id }).snippet.copyCount).toBe(1);
  });

  it.each(['window', 'shutdown', 'deadline', 'clear'])(
    'cancels queued copy before clipboard mutation on %s',
    async (mode) => {
      const value = fixture();
      const held = block();
      const preceding = value.mutations.run(async () => {
        await held.promise;
        return { ok: true, value: {} };
      });

      if (mode === 'deadline') vi.useFakeTimers();
      const copy = value.copy();

      await Promise.resolve();
      let closing: Promise<unknown> | undefined;

      if (mode === 'window') value.retire();
      if (mode === 'shutdown') closing = value.service.close();
      if (mode === 'deadline') await vi.advanceTimersByTimeAsync(30_000);
      if (mode === 'clear')
        closing = value.mutations.clear(() => Promise.resolve({ ok: true, value: {} }));
      held.release();
      await preceding;
      expect(await copy).toMatchObject({ ok: false });
      await closing;
      expect(value.writeText).not.toHaveBeenCalled();
      expect(value.hide).not.toHaveBeenCalled();
      expect(value.store.invoke('getSnippet', { id: value.id }).snippet.copyCount).toBe(0);
    }
  );

  it('drains entered write and statistics after owner closes/shutdown without retry or unrelated hide', async () => {
    const value = fixture();
    const held = block();

    value.writeText.mockImplementation(() => held.promise);
    const copy = value.copy();

    await vi.waitFor(() => {
      expect(value.writeText).toHaveBeenCalledTimes(1);
    });
    value.retire();
    let closed = false;
    const closing = value.service.close().then(() => {
      closed = true;
    });

    await Promise.resolve();
    expect(closed).toBe(false);
    held.release();
    expect(await copy).toMatchObject({
      ok: true,
      value: { statistics: { copyCount: 1 }, warnings: ['WINDOW_NOT_HIDDEN'] }
    });
    await closing;
    expect(value.writeText).toHaveBeenCalledTimes(1);
    expect(value.hide).not.toHaveBeenCalled();
    expect(await value.copy()).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
  });
  it.each(['write', 'statistics'])(
    'honors changed pin/hide policy after deferred %s',
    async (stage) => {
      const value = fixture();
      const held = block();

      if (stage === 'write') value.writeText.mockImplementation(() => held.promise);
      else
        value.call.mockImplementation(async (name, input) => {
          if (name === 'recordSuccessfulCopy') await held.promise;
          return value.originalCall(name, input);
        });
      const copy = value.copy();

      await vi.waitFor(() => {
        expect(value.writeText).toHaveBeenCalledTimes(1);
      });
      value.settings.alwaysOnTop = true;
      held.release();
      expect(await copy).toMatchObject({ ok: true, value: { warnings: [] } });
      expect(value.hide).not.toHaveBeenCalled();
    }
  );
});
