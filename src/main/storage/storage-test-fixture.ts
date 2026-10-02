import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { SearchRequest } from '../../shared/contracts/domain';
import type { DesktopResult } from '../../shared/contracts/result';
import { resultSchema } from '../../shared/contracts/result';
import { StorageEngine } from './engine';
import type { StorageOperation, StorageRequest, StorageResponse } from './protocol';
import { storageOperations } from './protocol';

export const allSnippets: SearchRequest = {
  query: '',
  tagIds: [],
  untagged: false,
  sort: 'newest',
  offset: 0,
  limit: 200
};

export function testStorage(now?: () => Date) {
  const directory = mkdtempSync(path.join(tmpdir(), 'promptly-storage-'));
  const filename = path.join(directory, 'data.sqlite');
  let engine = new StorageEngine(filename, now);

  return {
    get engine() {
      return engine;
    },
    filename,
    invoke<K extends StorageOperation>(name: K, input: StorageRequest<K>): StorageResponse<K> {
      const reply = engine.run(1, name, input);
      const result = resultSchema(storageOperations[name].response).parse(
        reply.result
      ) as DesktopResult<StorageResponse<K>>;

      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
      return result.value;
    },
    reopen() {
      engine.close();
      engine = new StorageEngine(filename, now);
    },
    dispose() {
      engine.close();
      rmSync(directory, { recursive: true, force: true });
    }
  };
}
