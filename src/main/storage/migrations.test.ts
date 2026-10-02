// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { migrate, migrations } from './migrations';

describe('versioned atomic migrations', () => {
  it('rolls back an entire pending upgrade and retains the previously committed database after reopen', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'promptly-migration-'));
    const filename = path.join(directory, 'database.sqlite');
    let db = new DatabaseSync(filename);

    try {
      db.exec('PRAGMA foreign_keys = ON');
      migrate(db);
      db.prepare('INSERT INTO settings VALUES (?, ?)').run('survives', '你好');
      expect(() => {
        migrate(db, [
          ...migrations,
          {
            version: migrations.length + 1,
            sql: "CREATE TABLE added (id INTEGER); UPDATE settings SET value = 'changed';"
          },
          { version: migrations.length + 2, sql: 'INSERT INTO nonexistent VALUES (1);' }
        ]);
      }).toThrow();
      db.close();
      db = new DatabaseSync(filename);
      expect(db.prepare('PRAGMA user_version').get()?.['user_version']).toBe(migrations.length);
      expect(db.prepare("SELECT value FROM settings WHERE key = 'survives'").get()?.['value']).toBe(
        '你好'
      );
      expect(
        db.prepare("SELECT name FROM sqlite_master WHERE name = 'added'").get()
      ).toBeUndefined();
      migrate(db, [
        ...migrations,
        { version: migrations.length + 1, sql: 'CREATE TABLE added (id INTEGER);' }
      ]);
      expect(db.prepare('PRAGMA user_version').get()?.['user_version']).toBe(migrations.length + 1);
    } finally {
      db.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects future schema versions and malformed migration ordering without changes', () => {
    const db = new DatabaseSync(':memory:');

    try {
      db.exec('PRAGMA user_version = 100');
      expect(() => {
        migrate(db);
      }).toThrow('Unsupported database version.');
      expect(db.prepare('PRAGMA user_version').get()?.['user_version']).toBe(100);
      db.exec('PRAGMA user_version = 0');
      expect(() => {
        migrate(db, [{ version: 2, sql: 'SELECT 1;' }]);
      }).toThrow('contiguous');
    } finally {
      db.close();
    }
  });

  it('enforces foreign keys and database uniqueness independently of request validation', () => {
    const db = new DatabaseSync(':memory:');

    try {
      db.exec('PRAGMA foreign_keys = ON');
      migrate(db);
      expect(() =>
        db.prepare('INSERT INTO snippet_tags VALUES (?, ?)').run('absent', 'absent')
      ).toThrow();
      db.prepare('INSERT INTO tags VALUES (?, ?, ?, ?)').run('a', 'Work', 'blue', 'now');
      expect(() =>
        db.prepare('INSERT INTO tags VALUES (?, ?, ?, ?)').run('b', 'work', 'blue', 'now')
      ).toThrow();
    } finally {
      db.close();
    }
  });
});
