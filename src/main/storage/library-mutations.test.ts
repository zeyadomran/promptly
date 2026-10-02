// @vitest-environment node
import { afterAll, afterEach, expect, it } from 'vitest';

import { LibraryMutations } from './library-mutations';
import { allSnippets, testStorage } from './storage-test-fixture';

const store = testStorage();

afterAll(() => {
  store.dispose();
});

afterEach(() => {
  store.invoke('clearLibrary', {});
});

it('invalidates queued writes and a delayed pre-clear capture, drains active work, and erases undo', async () => {
  const mutations = new LibraryMutations();
  const ticket = mutations.beginCapture();
  const deleted = store.invoke('createSnippet', { text: 'undo' }).snippet;
  const undo = store.invoke('deleteSnippet', { id: deleted.id }).undoToken;
  let finish: (() => void) | undefined;
  const active = mutations.run(async () => {
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    return { ok: true, value: store.invoke('createSnippet', { text: 'active' }) };
  });

  await Promise.resolve();
  const queued = mutations.run(() =>
    Promise.resolve({ ok: true, value: store.invoke('createSnippet', { text: 'queued' }) })
  );
  const clear = mutations.clear(() =>
    Promise.resolve({ ok: true, value: store.invoke('clearLibrary', {}) })
  );

  expect(mutations.beginCapture()).toBeUndefined();
  finish?.();
  expect((await active).ok).toBe(true);
  expect(await queued).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
  expect((await clear).ok).toBe(true);
  if (ticket === undefined) throw new Error('Missing owned capture ticket.');
  expect(
    await mutations.commitCapture(ticket, () =>
      Promise.resolve({
        ok: true,
        value: store.invoke('captureSnippet', { text: 'late', sourceApp: null, sourceAppId: null })
      })
    )
  ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
  expect(store.invoke('searchSnippets', allSnippets).total).toBe(0);
  expect(store.engine.run(1, 'undoDeleteSnippet', { undoToken: undo }).result).toMatchObject({
    ok: false,
    error: { code: 'NOT_FOUND' }
  });
  const fresh = mutations.beginCapture();

  if (fresh === undefined) throw new Error('Missing fresh capture ticket.');
  expect(
    (
      await mutations.commitCapture(fresh, () =>
        Promise.resolve({ ok: true, value: store.invoke('createSnippet', { text: 'fresh' }) })
      )
    ).ok
  ).toBe(true);
});

it('stops new commands during shutdown while accepted mutations finish', async () => {
  const mutations = new LibraryMutations();
  const accepted = mutations.run(() =>
    Promise.resolve({ ok: true, value: store.invoke('createSnippet', { text: 'accepted' }) })
  );
  const closing = mutations.close();

  expect(mutations.beginCapture()).toBeUndefined();
  expect(await mutations.run(() => Promise.resolve({ ok: true, value: {} }))).toMatchObject({
    ok: false,
    error: { code: 'UNAVAILABLE' }
  });
  await closing;
  expect((await accepted).ok).toBe(true);
  expect(store.invoke('searchSnippets', allSnippets).total).toBe(1);
});
