import type { DatabaseSync } from 'node:sqlite';

import { defaultSettings } from '../../shared/contracts/settings';

export interface Migration {
  version: number;
  sql: string;
}

export const migrations: readonly Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE metadata (id INTEGER PRIMARY KEY CHECK(id = 1), revision INTEGER NOT NULL CHECK(revision >= 0));
      INSERT INTO metadata VALUES (1, 0);
      CREATE TABLE snippets (
        id TEXT PRIMARY KEY, text TEXT NOT NULL, textHash TEXT NOT NULL,
        createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
        sourceApp TEXT, sourceAppId TEXT, lastCopiedAt TEXT,
        copyCount INTEGER NOT NULL DEFAULT 0 CHECK(copyCount >= 0)
      );
      CREATE INDEX snippets_hash ON snippets(textHash, createdAt, id);
      CREATE INDEX snippets_newest ON snippets(updatedAt DESC, id);
      CREATE INDEX snippets_oldest ON snippets(createdAt, id);
      CREATE INDEX snippets_copies ON snippets(copyCount DESC, id);
      CREATE INDEX snippets_recent_copies ON snippets(lastCopiedAt DESC, id);
      CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        color TEXT NOT NULL, createdAt TEXT NOT NULL);
      CREATE TABLE snippet_tags (
        snippetId TEXT NOT NULL REFERENCES snippets(id) ON DELETE CASCADE,
        tagId TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY(snippetId, tagId)
      );
      CREATE INDEX snippet_tags_tag ON snippet_tags(tagId, snippetId);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    `
  },
  {
    version: 2,
    sql: `
      UPDATE settings SET value = '"always"' WHERE key = 'hideAfterCopy' AND value = 'true';
      UPDATE settings SET value = '"never"' WHERE key = 'hideAfterCopy' AND value = 'false';
      ${Object.entries(defaultSettings())
        .map(
          ([key, value]) =>
            `INSERT OR IGNORE INTO settings (key, value) VALUES ('${key}', '${JSON.stringify(value).replaceAll("'", "''")}');`
        )
        .join('\n')}
    `
  },
  { version: 3, sql: 'ALTER TABLE snippets ADD COLUMN textUtf16 BLOB;' }
];

export function migrate(db: DatabaseSync, versions: readonly Migration[] = migrations): void {
  const row = db.prepare('PRAGMA user_version').get();
  const current = Number(row?.['user_version']);
  const latest = versions.at(-1)?.version ?? 0;

  if (!Number.isSafeInteger(current) || current > latest)
    throw new Error('Unsupported database version.');
  if (versions.some((migration, index) => migration.version !== index + 1))
    throw new Error('Migration versions must be contiguous.');
  if (current === latest) return;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const migration of versions.filter((entry) => entry.version > current)) {
      db.exec(migration.sql);
      db.exec(`PRAGMA user_version = ${String(migration.version)}`);
    }

    if (db.prepare('PRAGMA foreign_key_check').all().length !== 0)
      throw new Error('Migration violated foreign keys.');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
