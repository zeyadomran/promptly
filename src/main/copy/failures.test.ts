import { expect, it } from 'vitest';

import { copyFixture } from './copy-test-fixture';

it('leaves statistics and visibility unchanged when the external clipboard rejects', async () => {
  let activated = false;
  const fixture = copyFixture(
    () => Promise.reject(new Error('Owned clipboard unavailable')),
    'stored text',
    {
      returnToPreviousApp: () => {
        activated = true;
        return Promise.resolve({ returned: 'returned' });
      }
    }
  );

  try {
    expect(await fixture.copy()).toMatchObject({ ok: false });
    fixture.store.reopen();
    expect(fixture.store.invoke('getSnippet', { id: fixture.id }).snippet.copyCount).toBe(0);
    expect(fixture.visible()).toBe(true);
    expect(
      await fixture.service.executePrepared({ senderId: 1 }, () =>
        Promise.resolve({
          ok: true,
          value: {
            text: 'Owned draft',
            sourceIds: [],
            format: 'text',
            return: true,
            attachmentCount: 0
          }
        })
      )
    ).toMatchObject({ ok: false });
    expect(activated).toBe(false);
  } finally {
    await fixture.dispose();
  }
});

it('reports confirmed copy with a statistics warning when SQLite rejects persistence', async () => {
  const clipboard: string[] = [];
  const fixture = copyFixture(
    (text) => {
      clipboard.push(text);
      return Promise.resolve();
    },
    'stored text',
    { returnToPreviousApp: () => Promise.reject(new Error('Owned activation failure')) }
  );

  try {
    fixture.store.engine.context.db.exec(
      "CREATE TRIGGER reject_copy BEFORE UPDATE OF copyCount ON snippets BEGIN SELECT RAISE(ABORT, 'Owned persistence failure'); END"
    );
    expect(await fixture.copy()).toMatchObject({
      ok: true,
      value: { status: 'copied', warnings: ['STATISTICS_UNCONFIRMED'] }
    });
    expect(clipboard).toEqual(['stored text']);
    expect(fixture.store.invoke('getSnippet', { id: fixture.id }).snippet.copyCount).toBe(0);
    expect(
      await fixture.service.executePrepared({ senderId: 1 }, () =>
        Promise.resolve({
          ok: true,
          value: {
            text: 'Confirmed resolved text',
            sourceIds: [{ kind: 'snippet', id: fixture.id }],
            format: 'text',
            return: true,
            attachmentCount: 0
          }
        })
      )
    ).toMatchObject({
      ok: true,
      value: {
        status: 'copied',
        returned: 'unavailable',
        warnings: ['STATISTICS_UNCONFIRMED', 'RETURN_UNCONFIRMED']
      }
    });
    expect(clipboard).toEqual(['stored text', 'Confirmed resolved text']);
  } finally {
    await fixture.dispose();
  }
});
