import { expect, it } from 'vitest';

import { LibraryMutations } from '../storage/library-mutations';
import { testStorage } from '../storage/storage-test-fixture';
import { executeSaveAndReturn } from './save-and-return';

it('retains a confirmed durable save when returning is refused and does not return after a failed save', async () => {
  const store = testStorage();
  const mutations = new LibraryMutations();
  let returned = false;
  const save = () =>
    mutations.run(() =>
      Promise.resolve(store.engine.run(1, 'createSnippet', { text: 'Owned saved draft' }).result)
    );

  try {
    const saved = await executeSaveAndReturn(
      save,
      () => Promise.reject(new Error('Owned activation failure')),
      () => true
    );

    expect(saved).toMatchObject({
      ok: true,
      value: { status: 'saved', returned: 'unavailable', warnings: ['RETURN_UNCONFIRMED'] }
    });
    store.reopen();
    const entries = store.invoke('searchSnippets', {
      query: 'Owned saved draft',
      tagIds: [],
      untagged: false,
      sort: 'newest',
      offset: 0,
      limit: 20
    });

    expect(entries.total).toBe(1);
    store.engine.context.db.exec(
      "CREATE TRIGGER reject_save BEFORE INSERT ON snippets BEGIN SELECT RAISE(ABORT,'Owned save failure'); END;"
    );
    expect(
      await executeSaveAndReturn(
        save,
        () => {
          returned = true;
          return Promise.resolve({ returned: 'returned' });
        },
        () => true
      )
    ).toMatchObject({ ok: false });
    expect(returned).toBe(false);
  } finally {
    await mutations.close();
    store.dispose();
  }
});
