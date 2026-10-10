import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

import { workflowHeader, type WorkflowRecord } from '../../../shared/contracts/backup/workflow';
import type { transferStore } from './transfer-test-fixture';

export function workflowFixture(
  store: ReturnType<typeof transferStore>,
  records: WorkflowRecord[]
): string {
  const keys = {
    tag: 'tags',
    snippet: 'snippets',
    membership: 'memberships',
    queue: 'queue',
    queueMembership: 'queueMemberships',
    asset: 'assets',
    assetChunk: 'assetChunks',
    attachment: 'attachments'
  } as const;
  const counts = {
    tags: 0,
    snippets: 0,
    memberships: 0,
    queue: 0,
    queueMemberships: 0,
    assets: 0,
    assetChunks: 0,
    attachments: 0
  };
  const payload = records
    .map((record) => {
      counts[keys[record.type]]++;
      return JSON.stringify(record) + '\n';
    })
    .join('');

  writeFileSync(
    store.file,
    JSON.stringify(workflowHeader) +
      '\n' +
      payload +
      JSON.stringify({
        type: 'end',
        ...counts,
        sha256: createHash('sha256').update(payload).digest('hex')
      }) +
      '\n'
  );
  return store.file;
}
