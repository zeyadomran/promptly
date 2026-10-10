import { randomUUID } from 'node:crypto';

import { expect, it } from 'vitest';

import { assemblyFixture } from './assembly-test-fixture';

it('routes a staged draft through durable save and return without clipboard or retrying a confirmed save', async () => {
  const fixture = assemblyFixture();
  const context = { senderId: 1 };
  const draftId = randomUUID();

  try {
    const draft = await fixture.attachments.begin({}, context);

    if (!draft.ok) throw new Error('Draft lease failed');
    await fixture.attachments.services.chooseAttachments?.(
      { draftToken: draft.value.token },
      context
    );
    const prepared = await fixture.bridge.prepareCopy({
      source: {
        kind: 'draft',
        draftId,
        draftRevision: 1,
        text: '{{answer}}',
        attachmentCount: 1
      }
    });

    if (!prepared.ok) throw new Error('Copy preparation failed');
    const input = {
      destination: 'queue' as const,
      text: '{{answer}}',
      draftToken: draft.value.token,
      draftId,
      draftRevision: 1,
      return: true
    };

    fixture.store.engine.context.db.exec(
      "CREATE TRIGGER reject_save BEFORE INSERT ON queue_items BEGIN SELECT RAISE(ABORT,'Owned save failure'); END;"
    );
    expect(await fixture.bridge.saveWorkflowDraft(input)).toMatchObject({ ok: false });
    expect(fixture.activated).toBe(false);
    expect(fixture.clipboard).toEqual([]);
    expect(
      fixture.store.invoke('getAssetDraft', { draftToken: draft.value.token }).attachments
    ).toHaveLength(1);
    fixture.store.engine.context.db.exec('DROP TRIGGER reject_save');
    const saved = await fixture.bridge.saveWorkflowDraft(input);

    expect(saved).toMatchObject({
      ok: true,
      value: {
        status: 'saved',
        destination: 'queue',
        returned: 'unavailable',
        warnings: ['RETURN_UNCONFIRMED']
      }
    });
    if (!saved.ok) throw new Error('Save failed');
    expect(fixture.clipboard).toEqual([]);
    expect(
      await fixture.bridge.commitCopy({
        token: prepared.value.token,
        values: { answer: { value: 'value', leaveBlank: false } },
        format: 'text',
        mode: 'resolved',
        return: false,
        draftRevision: 1
      })
    ).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
    fixture.store.reopen();
    expect(fixture.store.invoke('getQueueItem', { id: saved.value.id }).item).toMatchObject({
      text: '{{answer}}',
      attachments: [{ name: 'Owned image.png' }],
      copyCount: 0
    });
    expect(fixture.store.invoke('listQueue', {}).items).toHaveLength(1);
    const queued = await fixture.bridge.prepareCopy({
      source: { kind: 'queue', id: saved.value.id }
    });

    if (!queued.ok) throw new Error('Queue preparation failed');
    expect(queued.value.attachmentCount).toBe(1);
    expect(
      await fixture.bridge.commitCopy({
        token: queued.value.token,
        values: { answer: { value: 'actual full queue text', leaveBlank: false } },
        format: 'text',
        mode: 'resolved',
        return: false
      })
    ).toMatchObject({ ok: true, value: { warnings: [], attachmentCount: 1 } });
    expect(fixture.clipboard).toEqual(['actual full queue text']);
    fixture.store.reopen();
    expect(fixture.store.invoke('getQueueItem', { id: saved.value.id }).item.copyCount).toBe(1);
    const attached = fixture.store.invoke('saveQueueItemToLibrary', { id: saved.value.id }).snippet;

    fixture.store.invoke('updateSnippet', { id: attached.id, text: 'Plain saved text' });
    expect(
      await fixture.copy.services.copySnippet({ id: attached.id, format: 'text' }, context)
    ).toMatchObject({
      ok: true,
      value: { attachmentCount: 1 }
    });
    expect(fixture.clipboard.at(-1)).toBe('Plain saved text');
    fixture.store.invoke('updateSnippet', { id: attached.id, text: '' });
    expect(
      await fixture.copy.services.copySnippet({ id: attached.id, format: 'text' }, context)
    ).toMatchObject({
      ok: false,
      error: { code: 'UNAVAILABLE' }
    });
    expect(fixture.clipboard.at(-1)).toBe('Plain saved text');
    fixture.retireOnSave();
    expect(
      await fixture.bridge.saveWorkflowDraft({
        destination: 'queue',
        draftId: randomUUID(),
        draftRevision: 0,
        text: 'Saved while its window retired',
        return: true
      })
    ).toMatchObject({
      ok: true,
      value: { status: 'saved', returned: 'unavailable', warnings: ['RETURN_UNCONFIRMED'] }
    });
    expect(fixture.activated).toBe(false);
    expect(fixture.clipboard.at(-1)).toBe('Plain saved text');
    fixture.store.reopen();
    expect(fixture.store.invoke('listQueue', {}).items).toHaveLength(2);
    expect(await fixture.bridge.saveWorkflowDraft(input)).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' }
    });
  } finally {
    await fixture.dispose();
  }
});
