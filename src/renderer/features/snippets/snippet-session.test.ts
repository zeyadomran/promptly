import { expect, it, vi } from 'vitest';

import { SnippetSession } from './snippet-session';
import { first, second, snippetSessionRecords } from './snippet-session-test-fixture';

it('preserves a dirty draft through selection changes and retires stale asynchronous results', async () => {
  const records = snippetSessionRecords();
  let release: (() => void) | undefined;
  let hold = false;
  let missing = false;
  let writeHold = false;
  let finishWrite: (() => void) | undefined;
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
      const persisted = { ok: true as const, value: { revision: 2, snippet } };

      if (!writeHold) {
        records.set(id, snippet);
        return Promise.resolve(persisted);
      }

      return new Promise((resolve) => {
        finishWrite = () => {
          records.set(id, snippet);
          resolve(persisted);
        };
      });
    }
  });

  try {
    session.select(first.id);
    await vi.waitFor(() => {
      expect(session.snapshot().snippet?.id).toBe(first.id);
    });
    hold = true;
    session.select(second.id);
    expect(session.snapshot()).toMatchObject({ loading: true, snippet: { id: first.id } });
    session.edit();
    expect(session.snapshot().editing).toBe(false);
    hold = false;
    release?.();
    await vi.waitFor(() => {
      expect(session.snapshot().snippet?.id).toBe(second.id);
    });
    session.select(first.id);
    await vi.waitFor(() => {
      expect(session.snapshot().snippet?.id).toBe(first.id);
    });
    hold = true;
    records.set(first.id, {
      ...first,
      tags: [
        {
          id: '00000000-0000-4000-8000-000000000003',
          name: 'desktop-check',
          color: 'red',
          createdAt: '2026-10-02T00:00:00Z'
        }
      ]
    });
    session.refresh();
    session.edit();
    expect(session.snapshot()).toMatchObject({
      loading: true,
      snippet: { id: first.id, tags: [] },
      editing: false
    });
    expect(await session.save()).toBe(false);
    hold = false;
    release?.();
    await vi.waitFor(() => {
      expect(session.snapshot().snippet?.tags[0]?.name).toBe('desktop-check');
    });
    session.edit();
    session.change('Discard this draft');
    session.discard();
    await vi.waitFor(() => {
      expect(session.snapshot()).toMatchObject({ editing: false, snippet: { id: first.id } });
    });
    session.edit();
    session.change('Preserved draft');
    session.select(null, true);
    expect(session.snapshot()).toMatchObject({
      prompt: false,
      draft: 'Preserved draft',
      snippet: { id: first.id }
    });
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
    session.select(first.id);
    writeHold = true;
    const saving = session.save();

    hold = true;
    session.refresh();
    hold = false;
    finishWrite?.();
    expect(await saving).toBe(true);
    writeHold = false;
    session.edit();
    release?.();
    await Promise.resolve();
    expect(session.snapshot()).toMatchObject({
      snippet: { text: 'Preserved draft' },
      draft: 'Preserved draft',
      conflict: false
    });
    expect(session.dirty).toBe(false);
    session.discard();
    session.select(second.id);
    await vi.waitFor(() => {
      expect(session.snapshot().snippet?.id).toBe(second.id);
    });
    expect(records.get(first.id)?.text).toBe('Preserved draft');
    expect(records.get(second.id)?.text).toBe('Other snippet');
    session.edit();
    session.change('Draft kept through clear and import');
    hold = true;
    session.refresh();
    hold = false;
    missing = true;
    session.refresh();
    await vi.waitFor(() => {
      expect(session.snapshot()).toMatchObject({
        missing: true,
        draft: 'Draft kept through clear and import'
      });
    });
    release?.();
    await Promise.resolve();
    expect(session.snapshot()).toMatchObject({
      missing: true,
      error: 'Snippet no longer exists.',
      draft: 'Draft kept through clear and import'
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
    missing = true;
    session.refresh();
    await vi.waitFor(() => {
      expect(session.snapshot()).toMatchObject({ loading: false, missing: true, snippet: null });
    });
    missing = false;
    hold = true;
    session.select(first.id);
    expect(session.snapshot()).toMatchObject({ loading: true, snippet: null });
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
