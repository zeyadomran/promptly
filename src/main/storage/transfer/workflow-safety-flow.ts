import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { workflowRecordSchema } from '../../../shared/contracts/backup/workflow';
import { png } from '../../attachments/png-test-fixture';
import type { transferStore } from './transfer-test-fixture';
import { workflowFixture } from './workflow-test-fixture';

export function assertWorkflowSafety(store: ReturnType<typeof transferStore>): void {
  const draft = store.invoke('beginAssetDraft', {});
  const image = store.invoke('storeDraftAttachment', {
    draftToken: draft.token,
    name: 'safe.png',
    kind: 'image',
    mimeType: 'image/png',
    bytes: png,
    width: 1,
    height: 1
  }).attachment;

  store.invoke('storeDraftAttachment', {
    draftToken: draft.token,
    name: 'Drawing.png',
    kind: 'drawing',
    mimeType: 'image/png',
    bytes: png,
    width: 1,
    height: 1,
    scene: { version: 1, width: 1, height: 1, backgroundAttachmentId: image.id, elements: [] }
  });
  store.invoke('createQueueItem', { text: '', draftToken: draft.token });
  const before = readFileSync(store.exportFile(), 'utf8');
  const records = before
    .trim()
    .split('\n')
    .flatMap((line) => {
      const parsed: unknown = JSON.parse(line);
      const record = workflowRecordSchema.safeParse(parsed);

      return record.success ? [record.data] : [];
    });
  const reject = (changed: typeof records) => {
    const filename = workflowFixture(store, changed);

    assert.partialDeepStrictEqual(
      store.engine.run(1, 'prepareLibraryImport', { filename }).result,
      { ok: false, error: { code: 'INVALID_REQUEST' } }
    );
    assert.equal(readFileSync(store.exportFile(), 'utf8'), before);
  };

  // Metadata must bound actual decoded chunks before staging allocates beyond the declared asset.
  reject(
    records.map((record) =>
      record.type === 'asset'
        ? {
            ...record,
            value: { ...record.value, attachment: { ...record.value.attachment, byteLength: 1 } }
          }
        : record
    )
  );
  reject(
    records.map((record) =>
      record.type === 'asset'
        ? {
            ...record,
            value: {
              ...record.value,
              attachment: { ...record.value.attachment, sha256: '0'.repeat(64) }
            }
          }
        : record
    )
  );
  reject(
    records.map((record) =>
      record.type === 'asset' && record.value.scene !== null
        ? {
            ...record,
            value: {
              ...record.value,
              scene: { ...record.value.scene, backgroundAttachmentId: record.value.attachment.id }
            }
          }
        : record
    )
  );
  const queue = records.find((record) => record.type === 'queue');

  if (queue?.type !== 'queue') throw new Error('Missing queue fixture');
  const chainQueueId = randomUUID();
  const ids = Array.from({ length: 65 }, () => randomUUID());
  const chain = ids.map((id, index) => ({
    type: 'asset' as const,
    value: {
      attachment: {
        ...image,
        id,
        kind: index === 64 ? ('image' as const) : ('drawing' as const),
        hasScene: index !== 64
      },
      scene:
        index === 64
          ? null
          : {
              version: 1 as const,
              width: 1,
              height: 1,
              backgroundAttachmentId: ids[index + 1],
              elements: []
            }
    }
  }));

  const root = ids[0];

  if (root === undefined) throw new Error('Missing background chain');
  reject([
    { ...queue, value: { ...queue.value, id: chainQueueId } },
    ...chain,
    ...ids.map((id) => ({
      type: 'assetChunk' as const,
      value: { id, index: 0, data: Buffer.from(png).toString('base64') }
    })),
    { type: 'attachment', value: { kind: 'queue', id: chainQueueId, position: 0, assetId: root } }
  ]);
}
