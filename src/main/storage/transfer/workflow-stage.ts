import { createHash } from 'node:crypto';
import { closeSync, fstatSync, openSync } from 'node:fs';

import { assetLimits } from '../../../shared/contracts/attachments';
import {
  workflowEndSchema,
  workflowHeaderSchema,
  type WorkflowRecord,
  workflowRecordSchema
} from '../../../shared/contracts/backup/workflow';
import { StorageError } from '../context';
import { ImportStage } from './import-stage';
import { readLines } from './read-lines';
import { verifyWorkflowStage } from './workflow-validation';

export function readWorkflowStage(filename: string): ImportStage | undefined {
  const descriptor = openSync(filename, 'r');
  let stage: ImportStage | undefined;

  try {
    if (!fstatSync(descriptor).isFile())
      throw new StorageError('UNAVAILABLE', 'Choose a readable, regular backup file.');
    const lines = readLines(descriptor);
    let first: IteratorResult<string, void>;

    try {
      first = lines.next();
    } catch (error) {
      // Format probing must not impose JSON Lines bounds on legacy whole documents.
      if (error instanceof StorageError && error.code === 'INVALID_REQUEST') return undefined;
      throw error;
    }

    if (first.done === true) return undefined;
    let header: unknown;

    try {
      header = JSON.parse(first.value);
    } catch {
      return undefined;
    }

    if (!workflowHeaderSchema.safeParse(header).success) return undefined;
    stage = new ImportStage();
    stage.db.exec('BEGIN');
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
    const phases = {
      tag: 0,
      snippet: 1,
      membership: 2,
      queue: 3,
      queueMembership: 4,
      asset: 5,
      assetChunk: 6,
      attachment: 7
    };
    const hash = createHash('sha256');
    let ended = false,
      phase = 0,
      total = 0,
      decodedBytes = 0;

    for (const line of lines) {
      if (ended) throw new Error('Trailing records');
      const parsed: unknown = JSON.parse(line),
        end = workflowEndSchema.safeParse(parsed);

      if (end.success) {
        if (
          Object.entries(counts).some(
            ([key, count]) => end.data[key as keyof typeof counts] !== count
          ) ||
          end.data.sha256 !== hash.digest('hex')
        )
          throw new Error('Incomplete backup');
        ended = true;
        continue;
      }

      const record = workflowRecordSchema.parse(parsed);

      if (phases[record.type] < phase) throw new Error('Records out of order');
      phase = phases[record.type];
      hash.update(`${line}\n`);
      counts[keys[record.type]]++;
      if (record.type === 'asset') {
        total += record.value.attachment.byteLength;
        if (total > assetLimits.totalBytes) throw new Error('Asset bytes exceed limit');
      }

      if (counts.queue > 2000) throw new Error('Queue exceeds limit');
      if (record.type === 'assetChunk') {
        decodedBytes += Buffer.byteLength(record.value.data, 'base64');
        if (decodedBytes > assetLimits.totalBytes)
          throw new Error('Decoded asset bytes exceed limit');
      }

      addWorkflowRecord(stage, record);
    }

    if (!ended) throw new Error('Incomplete backup');
    verifyWorkflowStage(stage);
    stage.db.exec('COMMIT');
    return stage;
  } catch (error) {
    stage?.close();
    if (stage === undefined) throw error;
    throw new StorageError(
      'INVALID_REQUEST',
      'Invalid, incomplete, or unsupported Promptly backup.'
    );
  } finally {
    closeSync(descriptor);
  }
}

function addWorkflowRecord(stage: ImportStage, record: WorkflowRecord): void {
  const { db } = stage;

  if (record.type === 'tag' || record.type === 'membership' || record.type === 'snippet') {
    stage.add(record);
    return;
  }

  if (record.type === 'queue')
    db.prepare('INSERT INTO workflow_queue(id,json) VALUES(?,?)').run(
      record.value.id,
      JSON.stringify(record.value)
    );
  if (record.type === 'queueMembership')
    db.prepare('INSERT INTO workflow_queue_tags VALUES(?,?)').run(
      record.value.itemId,
      record.value.tagId
    );
  if (record.type === 'asset')
    db.prepare('INSERT INTO workflow_assets(id,json) VALUES(?,?)').run(
      record.value.attachment.id,
      JSON.stringify(record.value)
    );
  if (record.type === 'assetChunk') {
    const bytes = Buffer.from(record.value.data, 'base64');

    if (bytes.toString('base64') !== record.value.data || bytes.byteLength > 65536)
      throw new Error('Invalid chunk');
    const metadata = workflowRecordSchema.parse({
      type: 'asset',
      value: JSON.parse(
        String(
          db.prepare('SELECT json FROM workflow_assets WHERE id=?').get(record.value.id)?.['json']
        )
      ) as unknown
    });

    if (metadata.type !== 'asset') throw new Error('Missing asset metadata');
    const prior = Number(
      db
        .prepare('SELECT COALESCE(SUM(length(data)),0) AS bytes FROM workflow_chunks WHERE id=?')
        .get(record.value.id)?.['bytes']
    );

    if (prior + bytes.byteLength > metadata.value.attachment.byteLength)
      throw new Error('Chunks exceed declared asset size');
    db.prepare('INSERT INTO workflow_chunks VALUES(?,?,?)').run(
      record.value.id,
      record.value.index,
      bytes
    );
  }

  if (record.type === 'attachment')
    db.prepare('INSERT INTO workflow_attachments VALUES(?,?,?,?)').run(
      record.value.kind,
      record.value.id,
      record.value.position,
      record.value.assetId
    );
}
