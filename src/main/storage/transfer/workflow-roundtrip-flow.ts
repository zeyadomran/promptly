import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';

import { workflowRecordSchema } from '../../../shared/contracts/backup/workflow';
import { png } from '../../attachments/png-test-fixture';
import { allSnippets } from '../storage-test-fixture';
import type { transferStore } from './transfer-test-fixture';
import { workflowFixture } from './workflow-test-fixture';

export function workflowRoundtrip(store: ReturnType<typeof transferStore>): void {
  const draft = store.invoke('beginAssetDraft', {});
  const attachment = store.invoke('storeDraftAttachment', {
    draftToken: draft.token,
    name: 'fixture.txt',
    kind: 'file',
    mimeType: 'text/plain',
    bytes: new Uint8Array([0, 1, 2, 255]),
    width: null,
    height: null
  }).attachment;
  const background = store.invoke('storeDraftAttachment', {
    draftToken: draft.token,
    name: 'background.png',
    kind: 'image',
    mimeType: 'image/png',
    bytes: png,
    width: 1,
    height: 1
  }).attachment;
  const drawing = store.invoke('storeDraftAttachment', {
    draftToken: draft.token,
    name: 'Drawing.png',
    kind: 'drawing',
    mimeType: 'image/png',
    bytes: png,
    width: 1,
    height: 1,
    scene: {
      version: 1,
      width: 1,
      height: 1,
      backgroundAttachmentId: background.id,
      elements: [
        {
          type: 'text',
          id: randomUUID(),
          at: { x: 0, y: 0 },
          text: 'annotation',
          color: '#000000',
          width: 2,
          fontSize: 12
        }
      ]
    }
  }).attachment;

  store.invoke('removeAssetDraft', { draftToken: draft.token, id: background.id });
  const tag = store.invoke('createTag', { name: 'workflow', color: 'teal' }).tag;
  const item = store.invoke('createQueueItem', {
    text: '',
    tagIds: [tag.id],
    draftToken: draft.token
  }).item;
  const snippet = store.invoke('saveQueueItemToLibrary', { id: item.id }).snippet;
  const templateText = ' '.repeat(1_024) + '\0{{name}} {{name}} {{Résumé}}\ud800';

  store.invoke('updateQueueItem', { id: item.id, text: templateText });
  const complete = store.exportFile();

  assert.ok(readFileSync(complete, 'utf8').includes('"version":3'));
  const markdown = readFileSync(store.exportFile('markdown'), 'utf16le');

  assert.ok(markdown.includes('Attachments omitted'));
  assert.ok(markdown.includes(templateText));
  store.invoke('clearLibrary', {});
  const preview = store.prepareFile(complete);

  store.invoke('commitLibraryImport', { token: preview.token, revision: preview.revision });
  assert.partialDeepStrictEqual(preview, { queueItems: 1, assets: 3 });
  store.reopen();
  assert.partialDeepStrictEqual(store.invoke('getQueueItem', { id: item.id }).item, {
    text: templateText,
    tags: [{ name: 'workflow' }],
    attachments: [{ id: attachment.id }, { id: drawing.id }]
  });
  assert.equal(store.invoke('listQueue', {}).items[0]?.variableCount, 2);
  assert.equal(
    store.invoke('getSnippet', { id: snippet.id }).snippet.attachments[0]?.id,
    attachment.id
  );
  assert.deepEqual(
    store.invoke('readManagedAttachment', { id: attachment.id }).bytes,
    new Uint8Array([0, 1, 2, 255])
  );
  assert.partialDeepStrictEqual(store.invoke('readManagedAttachment', { id: drawing.id }).scene, {
    backgroundAttachmentId: background.id,
    elements: [{ text: 'annotation' }]
  });
  assert.deepEqual(store.invoke('readManagedAttachment', { id: background.id }).bytes, png);
  const again = store.prepareFile(complete);

  store.invoke('commitLibraryImport', { token: again.token, revision: again.revision });
  assert.equal(store.invoke('listQueue', {}).openCount, 1);
  assert.equal(store.invoke('searchSnippets', allSnippets).total, 1);
  const records = readFileSync(complete, 'utf8')
    .trim()
    .split('\n')
    .flatMap((recordLine) => {
      const parsed: unknown = JSON.parse(recordLine);
      const result = workflowRecordSchema.safeParse(parsed);

      return result.success ? [result.data] : [];
    });
  const conflictFile = workflowFixture(
    store,
    records.map((record) =>
      record.type === 'asset' && record.value.attachment.id === background.id
        ? {
            ...record,
            value: {
              ...record.value,
              attachment: { ...record.value.attachment, name: 'changed background.png' }
            }
          }
        : record
    )
  );
  const conflict = store.prepareFile(conflictFile);

  assert.partialDeepStrictEqual(conflict, {
    remappedQueueIds: 1,
    remappedAssetIds: 2,
    remappedSnippetIds: 1
  });
  store.invoke('commitLibraryImport', { token: conflict.token, revision: conflict.revision });
  const changed = store.invoke('listQueue', {}).items.find((candidate) => candidate.id !== item.id);

  if (changed === undefined) throw new Error('Missing preserved queue version');
  const changedDrawing = changed.attachments[1];

  if (changedDrawing === undefined) throw new Error('Missing preserved drawing version');
  const changedScene = store.invoke('readManagedAttachment', { id: changedDrawing.id }).scene;

  assert.notEqual(changedScene?.backgroundAttachmentId, background.id);
  const repeatedConflict = store.prepareFile(conflictFile);

  store.invoke('commitLibraryImport', {
    token: repeatedConflict.token,
    revision: repeatedConflict.revision
  });
  assert.equal(store.invoke('listQueue', {}).openCount, 2);
  assert.equal(store.invoke('searchSnippets', allSnippets).total, 2);
  store.invoke('clearLibrary', {});
  const legacyId = randomUUID();
  const legacyRecord = {
    type: 'snippet',
    value: {
      id: legacyId,
      text: 'Legacy v2\0 exact',
      createdAt: '2026-10-10T00:00:00.000Z',
      updatedAt: '2026-10-10T00:00:00.000Z',
      copyCount: 0,
      lastCopiedAt: null
    }
  };
  const line = JSON.stringify(legacyRecord) + '\n';

  writeFileSync(
    store.file,
    JSON.stringify({ format: 'promptly-library', version: 2, encoding: 'jsonl' }) +
      '\n' +
      line +
      JSON.stringify({
        type: 'end',
        tags: 0,
        snippets: 1,
        memberships: 0,
        sha256: createHash('sha256').update(line).digest('hex')
      }) +
      '\n'
  );
  const legacyPreview = store.prepareFile(store.file);

  store.invoke('commitLibraryImport', {
    token: legacyPreview.token,
    revision: legacyPreview.revision
  });
  assert.equal(store.invoke('getSnippet', { id: legacyId }).snippet.text, legacyRecord.value.text);
  store.invoke('clearLibrary', {});
}
