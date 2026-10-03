import path from 'node:path';

import { app } from 'electron';

import type { ChangeEvent } from '../../shared/contracts/domain';
import { StorageClient } from './client';

export function desktopStorage(
  onChange: (change: ChangeEvent) => void,
  onFailure: (error: Error) => void
): StorageClient {
  return new StorageClient(
    path.join(__dirname, 'storage-worker.cjs'),
    path.join(app.getPath('userData'), 'promptly.sqlite'),
    onChange,
    onFailure
  );
}
