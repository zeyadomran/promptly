import type { SQLOutputValue } from 'node:sqlite';

import { attachmentSchema } from '../../shared/contracts/attachments';
import { StorageError } from '../storage/context';
import type { AssetRepository } from './repository';

export function validateBackground(assets: AssetRepository, id: string, token: string): void {
  if (!assets.accessible(id, token))
    throw new StorageError('NOT_FOUND', 'The drawing background is unavailable.');
  let current: string | undefined = id;
  const seen = new Set<string>();

  while (current !== undefined) {
    if (seen.size >= 63 || seen.has(current))
      throw new StorageError('INVALID_REQUEST', 'Drawing background chain exceeds the limit.');
    seen.add(current);
    const row: Record<string, SQLOutputValue> | undefined = assets.context.db
      .prepare('SELECT json,backgroundId FROM assets WHERE id=?')
      .get(current);

    if (row === undefined)
      throw new StorageError('NOT_FOUND', 'The drawing background is missing.');
    if (attachmentSchema.parse(JSON.parse(String(row['json']))).kind === 'file')
      throw new StorageError('INVALID_REQUEST', 'Only images can be drawing backgrounds.');
    current = row['backgroundId'] === null ? undefined : String(row['backgroundId']);
  }
}
