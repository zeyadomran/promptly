import { createHash } from 'node:crypto';
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';

import {
  streamEndSchema,
  streamHeaderSchema,
  streamRecordSchema
} from '../../../shared/contracts/backup/stream';
import { StorageError } from '../context';
import { ImportStage } from './import-stage';
import { readBackup } from './read-backup';
import { readLines } from './read-lines';

export function stageBackup(filename: string): ImportStage {
  let descriptor: number;

  try {
    descriptor = openSync(filename, 'r');
  } catch {
    throw new StorageError(
      'UNAVAILABLE',
      'The backup file is missing or unreadable. Choose an accessible file.'
    );
  }

  let stage: ImportStage | undefined;

  try {
    if (!fstatSync(descriptor).isFile())
      throw new StorageError('UNAVAILABLE', 'Choose a readable, regular backup file.');
    stage = new ImportStage();
    stage.db.exec('BEGIN');
    const prefix = Buffer.alloc(256);
    const bytes = readSync(descriptor, prefix, 0, prefix.length, 0);
    const newline = prefix.subarray(0, bytes).indexOf(10);
    let header: unknown;

    try {
      header = JSON.parse(prefix.subarray(0, newline < 0 ? bytes : newline).toString('utf8'));
    } catch {
      header = undefined;
    }

    if (streamHeaderSchema.safeParse(header).success) {
      const lines = readLines(descriptor);

      lines.next();
      const hash = createHash('sha256');
      let phase = 0;
      let ended = false;

      for (const line of lines) {
        if (ended) throw new Error('Trailing records');
        const parsed: unknown = JSON.parse(line);
        const end = streamEndSchema.safeParse(parsed);

        if (end.success) {
          const counts = end.data;

          if (
            counts.snippets !== stage.count('snippets') ||
            counts.tags !== stage.count('tags') ||
            counts.memberships !== stage.count('memberships') ||
            counts.sha256 !== hash.digest('hex')
          )
            throw new Error('Incomplete backup');
          ended = true;
          continue;
        }

        const record = streamRecordSchema.parse(parsed);
        const nextPhase = { tag: 0, snippet: 1, membership: 2 }[record.type];

        if (nextPhase < phase) throw new Error('Records out of order');
        phase = nextPhase;
        hash.update(`${line}\n`);
        stage.add(record);
      }

      if (!ended) throw new Error('Incomplete backup');
    } else {
      const backup = readBackup(descriptor);

      for (const value of backup.tags) stage.add({ type: 'tag', value });
      for (const value of backup.snippets) stage.add({ type: 'snippet', value });
      for (const value of backup.memberships) stage.add({ type: 'membership', value });
    }

    if (
      stage.db
        .prepare(
          'SELECT snippetId FROM memberships GROUP BY snippetId HAVING COUNT(*) > 100 LIMIT 1'
        )
        .get() !== undefined
    )
      throw new Error('Too many tags');
    stage.db.exec('COMMIT');
    return stage;
  } catch (error) {
    stage?.close();
    if (error instanceof StorageError) throw error;
    if (error instanceof Error && 'code' in error)
      throw new StorageError(
        'UNAVAILABLE',
        'Unable to read or stage the backup. Check file access and available disk space.'
      );
    throw new StorageError(
      'INVALID_REQUEST',
      'Invalid, incomplete, or unsupported Promptly backup.'
    );
  } finally {
    closeSync(descriptor);
  }
}
