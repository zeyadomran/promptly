import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  membershipSchema,
  portableSnippetSchema,
  portableTagSchema
} from '../../../shared/contracts/backup/format';
import type { streamRecordSchema } from '../../../shared/contracts/backup/stream';

type Record = ReturnType<typeof streamRecordSchema.parse>;

/** An owned disk database holds validated records and the reviewed conflict decisions. */
export class ImportStage {
  readonly directory = mkdtempSync(path.join(tmpdir(), 'promptly-import-'));
  readonly db: DatabaseSync;
  private closed = false;

  constructor() {
    let database: DatabaseSync | undefined;

    try {
      database = new DatabaseSync(path.join(this.directory, 'stage.sqlite'));
      database.exec(`PRAGMA cache_size = -2048; PRAGMA foreign_keys = ON;
      CREATE TABLE tags (id TEXT PRIMARY KEY, json TEXT NOT NULL, name TEXT COLLATE NOCASE, target TEXT, fresh INTEGER DEFAULT 0);
      CREATE TABLE snippets (id TEXT PRIMARY KEY, json TEXT NOT NULL, target TEXT UNIQUE, skip INTEGER DEFAULT 0);
      CREATE TABLE memberships (snippetId TEXT REFERENCES snippets(id), tagId TEXT REFERENCES tags(id), PRIMARY KEY(snippetId, tagId));
      CREATE INDEX memberships_by_tag ON memberships(tagId);
      CREATE INDEX tags_by_name ON tags(name COLLATE NOCASE);
      CREATE INDEX tags_by_target ON tags(target);`);
      this.db = database;
    } catch (error) {
      try {
        database?.close();
      } finally {
        rmSync(this.directory, { recursive: true, force: true });
      }

      throw error;
    }
  }

  add(record: Record) {
    if (record.type === 'tag')
      this.db
        .prepare('INSERT INTO tags(id,json,name) VALUES(?,?,?)')
        .run(record.value.id, JSON.stringify(record.value), record.value.name);
    else if (record.type === 'snippet')
      this.db
        .prepare('INSERT INTO snippets(id,json) VALUES(?,?)')
        .run(record.value.id, JSON.stringify(record.value));
    else
      this.db
        .prepare('INSERT INTO memberships VALUES(?,?)')
        .run(record.value.snippetId, record.value.tagId);
  }

  *tags() {
    for (const row of this.db.prepare('SELECT json FROM tags ORDER BY rowid').iterate())
      yield portableTagSchema.parse(JSON.parse(String(row['json'])));
  }

  *snippets() {
    for (const row of this.db.prepare('SELECT json FROM snippets ORDER BY rowid').iterate())
      yield portableSnippetSchema.parse(JSON.parse(String(row['json'])));
  }

  *memberships() {
    for (const row of this.db
      .prepare('SELECT snippetId,tagId FROM memberships ORDER BY rowid')
      .iterate())
      yield membershipSchema.parse(row);
  }

  count(table: 'snippets' | 'tags' | 'memberships'): number {
    return Number(this.db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get()?.['total']);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.db.close();
    } finally {
      rmSync(this.directory, { recursive: true, force: true });
    }
  }
}
