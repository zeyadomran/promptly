// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { operations } from '../../shared/contracts/operations';
import { failure } from '../../shared/contracts/result';
import { copyFixture } from './copy-test-fixture';

describe('authoritative copy effects', () => {
  const fixtures: ReturnType<typeof copyFixture>[] = [];
  const fixture = (text?: string) => {
    const value = copyFixture(
      {
        writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined),
        hide: vi.fn<() => Promise<boolean>>().mockResolvedValue(true)
      },
      text
    );

    fixtures.push(value);
    return { ...value, call: vi.spyOn(value.store.port, 'call') };
  };

  afterEach(async () => {
    await Promise.all(fixtures.splice(0).map((value) => value.dispose()));
  });

  it('copies the current full stored text once before one durable statistic update', async () => {
    const value = fixture();
    const text = `你好 😀\n${'full text '.repeat(50_000)}`;

    value.store.invoke('updateSnippet', { id: value.id, text });
    value.writeText.mockImplementation((copied) => {
      expect(copied).toBe(text);
      expect(value.store.invoke('getSnippet', { id: value.id }).snippet.copyCount).toBe(0);
      return Promise.resolve();
    });
    const result = await value.copy();

    expect(result).toMatchObject({ ok: true, value: { status: 'copied', warnings: [] } });
    expect(value.writeText).toHaveBeenCalledTimes(1);
    expect(value.call.mock.calls.map(([name]) => name)).toEqual([
      'getSnippet',
      'recordSuccessfulCopy'
    ]);
    expect(value.hide).toHaveBeenCalledTimes(1);
    value.store.reopen();
    expect(value.store.invoke('getSnippet', { id: value.id }).snippet).toMatchObject({
      text,
      copyCount: 1,
      lastCopiedAt: '2026-10-02T10:00:00.000Z'
    });
    if (!result.ok) throw new Error('Expected copied outcome.');
    expect(operations.copySnippet.response.parse(result.value)).toEqual(result.value);
  });

  it.each(['write failure', 'NUL', 'unpaired surrogate'])(
    'preserves counts and visibility on %s',
    async (mode) => {
      const value = fixture(
        mode === 'NUL'
          ? 'before\0after'
          : mode === 'unpaired surrogate'
            ? 'before\ud800after'
            : undefined
      );

      if (mode === 'write failure') value.writeText.mockRejectedValue(new Error('owned failure'));
      expect(await value.copy()).toMatchObject({ ok: false });
      expect(value.store.invoke('getSnippet', { id: value.id }).snippet.copyCount).toBe(0);
      expect(value.hide).not.toHaveBeenCalled();
      expect(value.call.mock.calls.map(([name]) => name)).toEqual(['getSnippet']);
      expect(value.writeText).toHaveBeenCalledTimes(mode === 'write failure' ? 1 : 0);
    }
  );

  it.each(['reject', 'error'])(
    'returns copied with unconfirmed statistics on %s without retry',
    async (mode) => {
      const value = fixture();

      value.call.mockImplementation(async (name, input) => {
        if (name === 'recordSuccessfulCopy') {
          if (mode === 'reject') throw new Error('owned worker failure');
          return failure('INTERNAL', 'Owned failure.');
        }

        return value.originalCall(name, input);
      });
      expect(await value.copy()).toMatchObject({
        ok: true,
        value: { status: 'copied', warnings: ['STATISTICS_UNCONFIRMED'] }
      });
      expect(value.writeText).toHaveBeenCalledTimes(1);
      expect(
        value.call.mock.calls.filter(([name]) => name === 'recordSuccessfulCopy')
      ).toHaveLength(1);
    }
  );

  it.each([
    ['automatic', false, true],
    ['automatic', true, false],
    ['always', true, true],
    ['never', false, false]
  ] as const)('applies %s hide policy with pin=%s', async (policy, pinned, expected) => {
    const value = fixture();

    value.settings.hideAfterCopy = policy;
    value.settings.alwaysOnTop = pinned;
    await value.copy();
    expect(value.hide).toHaveBeenCalledTimes(expected ? 1 : 0);
  });

  it.each(['reject', 'unrecoverable'])(
    'retains copied statistics when hiding is %s',
    async (mode) => {
      const value = fixture();

      if (mode === 'reject') value.hide.mockRejectedValue(new Error('owned hide failure'));
      else value.hide.mockResolvedValue(false);
      expect(await value.copy()).toMatchObject({
        ok: true,
        value: { statistics: { copyCount: 1 }, warnings: ['WINDOW_NOT_HIDDEN'] }
      });
      expect(value.writeText).toHaveBeenCalledTimes(1);
    }
  );
});
