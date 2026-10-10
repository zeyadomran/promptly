import { DatabaseSync } from 'node:sqlite';

import type { DesktopError } from '../../shared/contracts/result';
import { collectAssets } from '../attachments/collection';
import { migrate } from './migrations';
import { UndoCache } from './undo-cache';

export class StorageError extends Error {
  constructor(
    readonly code: DesktopError['code'],
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

export class StorageContext {
  readonly db: DatabaseSync;
  readonly undo = new UndoCache();
  private callbacks: (() => void)[] = [];

  constructor(
    filename: string,
    readonly now: () => Date = () => new Date()
  ) {
    this.db = new DatabaseSync(filename);
    try {
      this.db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
      migrate(this.db);
      this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
      this.db.exec('DELETE FROM drafts; DELETE FROM asset_undo; DELETE FROM queue_undo;');
      collectAssets(this.db, this.now().getTime());
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  revision(): number {
    return Number(
      this.db.prepare('SELECT revision FROM metadata WHERE id = 1').get()?.['revision']
    );
  }

  afterCommit(callback: () => void): void {
    this.callbacks.push(callback);
  }

  transaction<T>(action: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    this.callbacks = [];
    let value: T;

    try {
      const revision = this.revision();

      if (!Number.isSafeInteger(revision) || revision >= Number.MAX_SAFE_INTEGER)
        throw new StorageError('INTERNAL', 'Storage revision limit reached.');
      this.db.prepare('UPDATE metadata SET revision = revision + 1 WHERE id = 1').run();
      collectAssets(this.db, this.now().getTime());
      value = action();
      collectAssets(this.db, this.now().getTime());
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      this.callbacks = [];
      throw error;
    }

    for (const callback of this.callbacks) callback();
    this.callbacks = [];
    return value;
  }
}
