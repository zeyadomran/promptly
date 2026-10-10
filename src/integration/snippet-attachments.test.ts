import { expect, it, vi } from 'vitest';

import { SnippetSession } from '../renderer/features/snippets/snippet-session';
import { assemblyFixture } from './assembly-test-fixture';

it('stages snippet attachment edits atomically, preserving failed edits and discarding staged removals', async () => {
  const fixture = assemblyFixture();
  const session = new SnippetSession(fixture.bridge);
  const saved = fixture.store.invoke('createSnippet', { text: 'Original saved text' }).snippet;

  try {
    session.select(saved.id);
    await vi.waitFor(() => {
      expect(session.snapshot().snippet?.id).toBe(saved.id);
    });
    await session.edit();
    const token = session.snapshot().draftToken;

    expect(token).toEqual(expect.any(String));
    if (token === undefined) throw new Error('Attachment lease missing');
    session.setAssetPending(token, true);
    session.refresh();
    await vi.waitFor(() => {
      expect(session.snapshot()).toMatchObject({
        editing: true,
        draftToken: token,
        assetPending: true
      });
    });
    expect(await session.requestExit()).toBe(false);
    const added = await fixture.bridge.chooseAttachments({ draftToken: token });

    if (!added.ok) throw new Error('Attachment intake failed');
    session.refreshAttachments(added.value.attachments);
    session.setAssetPending(token, false);
    session.change('');
    expect(session.dirty).toBe(true);
    fixture.store.engine.context.db.exec(
      "CREATE TRIGGER reject_edit BEFORE UPDATE ON snippets BEGIN SELECT RAISE(ABORT,'Owned edit failure'); END;"
    );
    expect(await session.save()).toBe(false);
    expect(session.snapshot()).toMatchObject({
      editing: true,
      draft: '',
      draftAttachments: [{ name: 'Owned image.png' }]
    });
    fixture.store.engine.context.db.exec('DROP TRIGGER reject_edit');
    expect(await session.save()).toBe(true);
    fixture.store.reopen();
    expect(fixture.store.invoke('getSnippet', { id: saved.id }).snippet).toMatchObject({
      text: '',
      attachments: [{ name: 'Owned image.png' }]
    });
    await session.edit();
    const edit = session.snapshot();
    const attachment = edit.draftAttachments[0];

    if (edit.draftToken === undefined || attachment === undefined)
      throw new Error('Staged attachment missing');
    const removed = await fixture.bridge.removeDraftAttachment({
      draftToken: edit.draftToken,
      id: attachment.id
    });

    if (!removed.ok) throw new Error('Remove failed');
    session.refreshAttachments(removed.value.attachments);
    expect(await session.save()).toBe(false);
    fixture.store.engine.context.db.exec(
      "CREATE TRIGGER reject_discard BEFORE DELETE ON drafts BEGIN SELECT RAISE(ABORT,'Owned cleanup failure'); END;"
    );
    await session.discard();
    expect(session.snapshot()).toMatchObject({
      editing: true,
      draftToken: edit.draftToken,
      draftAttachments: []
    });
    expect(session.snapshot().error).toEqual(expect.any(String));
    fixture.store.engine.context.db.exec('DROP TRIGGER reject_discard');
    await session.discard();
    expect(fixture.store.invoke('getSnippet', { id: saved.id }).snippet.attachments).toHaveLength(
      1
    );
    session.resetAfterClear();
    session.refreshAttachments(added.value.attachments, token);
    expect(session.snapshot()).toMatchObject({
      editing: false,
      pending: false,
      snippet: null,
      draftAttachments: []
    });
    expect(fixture.clipboard).toEqual([]);
  } finally {
    session.close();
    await fixture.dispose();
  }
});
