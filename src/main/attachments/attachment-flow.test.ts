import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, it } from 'vitest';

import type { DesktopResult } from '../../shared/contracts/result';
import type { StorageClient } from '../storage/client';
import { LibraryMutations } from '../storage/library-mutations';
import type { StorageOperation, StorageRequest, StorageResponse } from '../storage/protocol';
import { testStorage } from '../storage/storage-test-fixture';
import { png } from './png-test-fixture';
import { retirePendingDraft } from './retirement-flow';
import { AttachmentService } from './service';

it('owns managed originals, sender drafts, shared assets and drawing backgrounds through save, undo and durable reopen', async () => {
  const store = testStorage();
  const file = path.join(path.dirname(store.filename), 'fixture.png');

  writeFileSync(file, png);
  const storage: Pick<StorageClient, 'call'> = {
    call: <K extends StorageOperation>(name: K, input: StorageRequest<K>) =>
      Promise.resolve(store.engine.run(1, name, input).result as DesktopResult<StorageResponse<K>>)
  };
  const context = { senderId: 7 };
  const effects = {
    owner: (id: number) => ({ id, isAlive: () => true, onClose: () => () => undefined }),
    choose: () =>
      Promise.resolve([{ name: 'fixture.png', mimeType: 'image/png', bytes: readFileSync(file) }]),
    paste: () => Promise.resolve([]),
    raster: () => ({ png, width: 1, height: 1 }),
    copyPng: () => Promise.resolve(),
    save: () => Promise.resolve({ status: 'cancelled' as const })
  };
  const service = new AttachmentService(storage, new LibraryMutations(), effects);

  try {
    const draft = await service.begin({}, context);

    expect(draft.ok).toBe(true);
    if (!draft.ok) throw new Error('Draft failed');
    const intake = await service.services.chooseAttachments?.(
      { draftToken: draft.value.token },
      context
    );

    expect(intake?.ok).toBe(true);
    if (intake?.ok !== true) throw new Error('Intake failed');
    const original = intake.value.attachments[0];

    if (original === undefined) throw new Error('Missing image');
    renameSync(file, `${file}.moved`);
    expect(
      await service.content(
        'createSnippet',
        { text: '', draftToken: draft.value.token },
        { senderId: 8 }
      )
    ).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
    expect(
      await service.content(
        'createSnippet',
        {
          text: '',
          tagIds: ['00000000-0000-4000-8000-000000000001'],
          draftToken: draft.value.token
        },
        context
      )
    ).toMatchObject({ ok: false });
    const saved = await service.content(
      'createSnippet',
      { text: '', draftToken: draft.value.token },
      context
    );

    expect(saved.ok).toBe(true);
    if (!saved.ok) throw new Error('Save failed');
    const snippetId = saved.value.snippet.id;
    const queue = store.invoke('addSnippetToQueue', { id: snippetId }).item;

    expect(queue.attachments[0]?.id).toBe(original.id);
    const editing = await service.begin({ source: { kind: 'snippet', id: snippetId } }, context);

    if (!editing.ok) throw new Error('Edit failed');
    expect(await service.services.copyDrawingPng?.({ png }, context)).toMatchObject({
      ok: true,
      value: { status: 'copied' }
    });
    expect(await service.services.exportDrawingPng?.({ png }, context)).toMatchObject({
      ok: true,
      value: { status: 'cancelled' }
    });
    expect(
      store
        .invoke('getAssetDraft', { draftToken: editing.value.token })
        .attachments.map((asset) => asset.id)
    ).toEqual([original.id]);
    const drawing = await service.services.saveDrawing?.(
      {
        draftToken: editing.value.token,
        png,
        scene: {
          version: 1,
          width: 1,
          height: 1,
          backgroundAttachmentId: original.id,
          elements: []
        }
      },
      context
    );

    expect(drawing?.ok).toBe(true);
    if (drawing?.ok !== true) throw new Error('Drawing failed');
    await service.services.removeDraftAttachment?.(
      { draftToken: editing.value.token, id: original.id },
      context
    );
    expect(
      await service.content(
        'updateSnippet',
        { id: snippetId, text: '', draftToken: editing.value.token },
        context
      )
    ).toMatchObject({ ok: true });
    store.invoke('deleteQueueItem', { id: queue.id });
    const deletion = store.invoke('deleteSnippet', { id: snippetId });

    store.invoke('undoDeleteSnippet', { undoToken: deletion.undoToken });
    store.reopen();
    expect(store.invoke('getSnippet', { id: snippetId }).snippet.attachments[0]?.hasScene).toBe(
      true
    );
    const background = store.invoke('readManagedAttachment', { id: original.id });

    expect(background.bytes).toEqual(png);
    expect(
      await service.services.getAttachmentImage?.({ id: drawing.value.attachment.id }, context)
    ).toMatchObject({ ok: true, value: { width: 1, height: 1 } });
    await retirePendingDraft(storage, effects);
    store.invoke('clearLibrary', {});
    expect(store.engine.run(1, 'readManagedAttachment', { id: original.id }).result).toMatchObject({
      ok: false
    });
  } finally {
    await service.close();
    store.dispose();
  }
});
