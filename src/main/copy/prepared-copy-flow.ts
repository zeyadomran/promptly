import assert from 'node:assert/strict';

import type { copyFixture } from './copy-test-fixture';

/** Extend the canonical copy flow with the resolver-under-mutation-turn contract. */
export async function assertPreparedCopyTurn(fixture: ReturnType<typeof copyFixture>) {
  let release: () => void = () => undefined;
  let entered: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const editing = fixture.mutations.run(async () => {
    entered();
    await held;
    fixture.store.invoke('updateSnippet', {
      id: fixture.id,
      text: 'Authoritative after queued edit'
    });
    return { ok: true, value: {} };
  });

  try {
    await ready;
    const copying = fixture.service.executePrepared({ senderId: 1 }, () => {
      const snapshot = fixture.store.invoke('getSnippet', { id: fixture.id });

      return Promise.resolve({
        ok: true,
        value: {
          text: snapshot.snippet.text,
          sourceIds: [{ kind: 'snippet', id: fixture.id }],
          format: 'text',
          return: false,
          attachmentCount: 0
        }
      });
    });

    release();
    await editing;
    assert.partialDeepStrictEqual(await copying, {
      ok: true,
      value: { status: 'copied', statistics: [{ copyCount: 5 }] }
    });
  } finally {
    release();
    await editing;
  }
}
