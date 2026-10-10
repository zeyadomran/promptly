import type { DatabaseSync } from 'node:sqlite';

import { StorageStartupError } from './startup-failure';

export interface Migration {
  version: number;
  sql: string;
}

// Freeze historical migration values; new setting defaults are migrated by SettingsRepository.
const legacySettingsDefaults = {
  launchAtLogin: false,
  showInTray: true,
  hideAfterCopy: 'never',
  defaultSizeMode: 'compact',
  saveShortcut: { kind: 'double-tap', modifier: 'shift' },
  openShortcut: 'Alt+Space',
  pinShortcut: null,
  localShortcuts: {
    next: 'Down',
    previous: 'Up',
    copy: 'Return',
    delete: 'Delete',
    deleteAlternate: 'Backspace',
    focusSearch: 'CommandOrControl+F',
    tag: 'CommandOrControl+T',
    settings: 'CommandOrControl+,',
    dismiss: 'Escape',
    cancelEdit: 'Escape'
  },
  doubleTapWindowMs: 300,
  showConfirmationToast: true,
  normalizeWhitespace: true,
  theme: 'system',
  alwaysOnTop: false,
  rememberedBounds: { compact: null, regular: null },
  onboardingComplete: false
};

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
      ${Object.entries(legacySettingsDefaults)
        .map(
          ([key, value]) =>
            `INSERT OR IGNORE INTO settings (key, value) VALUES ('${key}', '${JSON.stringify(value).replaceAll("'", "''")}');`
        )
        .join('\n')}
    `
  },
  { version: 3, sql: 'ALTER TABLE snippets ADD COLUMN textUtf16 BLOB;' },
  {
    version: 4,
    sql: `
    CREATE TABLE queue_items(id TEXT PRIMARY KEY,text TEXT NOT NULL,textUtf16 BLOB,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL,completedAt TEXT,position INTEGER NOT NULL,copyCount INTEGER NOT NULL DEFAULT 0,lastCopiedAt TEXT);
    CREATE TABLE queue_tags(itemId TEXT REFERENCES queue_items(id) ON DELETE CASCADE,tagId TEXT REFERENCES tags(id) ON DELETE CASCADE,PRIMARY KEY(itemId,tagId));
    CREATE TABLE assets(id TEXT PRIMARY KEY,json TEXT NOT NULL,data BLOB NOT NULL,scene TEXT,backgroundId TEXT REFERENCES assets(id));
    CREATE TABLE content_assets(ownerKind TEXT NOT NULL CHECK(ownerKind IN ('snippet','queue')),ownerId TEXT NOT NULL,position INTEGER NOT NULL,assetId TEXT REFERENCES assets(id),PRIMARY KEY(ownerKind,ownerId,position),UNIQUE(ownerKind,ownerId,assetId));
    CREATE TABLE drafts(token TEXT PRIMARY KEY);
    CREATE TABLE draft_assets(token TEXT REFERENCES drafts(token) ON DELETE CASCADE,position INTEGER NOT NULL,assetId TEXT REFERENCES assets(id),PRIMARY KEY(token,position),UNIQUE(token,assetId));
    CREATE TABLE asset_undo(token TEXT NOT NULL,assetId TEXT REFERENCES assets(id),expires INTEGER NOT NULL,PRIMARY KEY(token,assetId));
    CREATE TABLE queue_undo(token TEXT PRIMARY KEY,kind TEXT NOT NULL,json TEXT NOT NULL,expires INTEGER NOT NULL);
  `
  }
];

export function migrate(db: DatabaseSync, versions: readonly Migration[] = migrations): void {
  const row = db.prepare('PRAGMA user_version').get();
  const current = Number(row?.['user_version']);
  const latest = versions.at(-1)?.version ?? 0;

  if (!Number.isSafeInteger(current) || current > latest) throw new StorageStartupError('newer');
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
