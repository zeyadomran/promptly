import { describe, expect, it, vi } from 'vitest';

import { dispatchOperation } from './dispatch-operation';

describe('privileged IPC dispatch', () => {
  it('rejects unauthorized senders before invoking services', async () => {
    const handler = vi.fn();
    const result = await dispatchOperation({ listTags: handler }, false, 'listTags', {});

    expect(result).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
    expect(handler).not.toHaveBeenCalled();
  });
  it('rejects malformed requests before invoking services', async () => {
    const handler = vi.fn();
    const result = await dispatchOperation({ listTags: handler }, true, 'listTags', {
      channel: 'shell'
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
    expect(handler).not.toHaveBeenCalled();
  });
  it('validates replies and does not transport thrown privileged details', async () => {
    const invalid = await dispatchOperation(
      {
        listTags: vi
          .fn()
          .mockResolvedValue({ ok: true, value: { revision: 1, tags: [], path: '/secret' } })
      },
      true,
      'listTags',
      {}
    );
    const exception = await dispatchOperation(
      { listTags: vi.fn().mockRejectedValue(new Error('SELECT password FROM /private/db')) },
      true,
      'listTags',
      {}
    );

    expect(invalid).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
    expect(JSON.stringify(exception)).not.toMatch(/password|private|SELECT/);
    expect(await dispatchOperation({}, true, 'captureSelection', {})).toMatchObject({
      ok: false,
      error: { code: 'UNAVAILABLE' }
    });
  });
  it('preserves validated authoritative snapshots and typed conflicts', async () => {
    const response = { ok: true as const, value: { revision: 2, tags: [] } };

    expect(
      await dispatchOperation({ listTags: () => Promise.resolve(response) }, true, 'listTags', {})
    ).toEqual(response);
    expect(
      await dispatchOperation(
        {
          listTags: () =>
            Promise.resolve({
              ok: false,
              error: { code: 'CONFLICT', message: 'Shortcut registration failed.' }
            })
        },
        true,
        'listTags',
        {}
      )
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
  });
});
