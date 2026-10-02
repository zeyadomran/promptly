import { expect, it, vi } from 'vitest';

import type { Snippet } from '../../../shared/contracts/domain';
import { SnippetSession } from './snippet-session';

it('preserves a dirty draft through selection changes and retires stale asynchronous results', async () => {
  const first: Snippet = {
    id: '00000000-0000-4000-8000-000000000001',
    text: 'Original 雪🙂',
    createdAt: '2026-10-02T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
    sourceApp: null,
    sourceAppId: null,
    tags: [],
    lastCopiedAt: null,
    copyCount: 0
  };
  const second = { ...first, id: '00000000-0000-4000-8000-000000000002', text: 'Other snippet' };
  const records = new Map([
    [first.id, first],
    [second.id, second]
  ]);
  let release: (() => void) | undefined;
  let hold = false;
  let missing = false;
  const session = new SnippetSession({
    getSnippet: ({ id }) => {
      if (missing)
        return Promise.resolve({
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Snippet no longer exists.' }
        });
      const value = {
        ok: true as const,
        value: { revision: 1, snippet: records.get(id) ?? first }
      };

      return hold
        ? new Promise((resolve) => {
            release = () => {
              resolve(value);
            };
          })
        : Promise.resolve(value);
    },
    updateSnippet: ({ id, text }) => {
      const snippet = { ...(records.get(id) ?? first), text };

      records.set(id, snippet);
      return Promise.resolve({ ok: true, value: { revision: 2, snippet } });
    }
  });

  try {
    session.select(first.id);
    await vi.waitFor(() => {
      expect(session.snapshot().snippet?.id).toBe(first.id);
    });
    session.edit();
    session.change('Discard this draft');
    session.discard();
    await vi.waitFor(() => {
      expect(session.snapshot()).toMatchObject({ editing: false, snippet: { id: first.id } });
    });
    expect(records.get(first.id)?.text).toBe('Original 雪🙂');
    session.edit();
    session.change('Preserved draft');
    session.select(second.id);
    expect(session.snapshot()).toMatchObject({
      prompt: true,
      draft: 'Preserved draft',
      editing: true
    });
    session.keep();
    expect(session.snapshot().draft).toBe('Preserved draft');
    session.warnModeChange();
    expect(session.snapshot().prompt).toBe(true);
    expect(await session.save()).toBe(true);
    await vi.waitFor(() => {
      expect(session.snapshot().snippet?.id).toBe(second.id);
    });
    expect(records.get(first.id)?.text).toBe('Preserved draft');
    expect(records.get(second.id)?.text).toBe('Other snippet');
    session.edit();
    session.change('Draft kept through clear and import');
    missing = true;
    session.refresh();
    await vi.waitFor(() => {
      expect(session.snapshot()).toMatchObject({
        missing: true,
        draft: 'Draft kept through clear and import'
      });
    });
    expect(await session.save()).toBe(false);
    missing = false;
    records.set(second.id, { ...second, text: 'Imported replacement' });
    session.refresh();
    await vi.waitFor(() => {
      expect(session.snapshot()).toMatchObject({
        missing: false,
        conflict: true,
        draft: 'Draft kept through clear and import'
      });
    });
    session.discard();
    await vi.waitFor(() => {
      expect(session.snapshot().snippet?.text).toBe('Imported replacement');
    });
    hold = true;
    session.select(first.id);
    hold = false;
    session.select(second.id);
    release?.();
    await vi.waitFor(() => {
      expect(session.snapshot()).toMatchObject({ loading: false, snippet: { id: second.id } });
    });
  } finally {
    session.close();
  }
});
