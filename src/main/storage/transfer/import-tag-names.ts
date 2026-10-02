import type { DatabaseSync } from 'node:sqlite';

/** Use the database's own collation for in-file collisions, including embedded NUL. */
export class ImportTagNames {
  constructor(private readonly database: DatabaseSync) {
    database.exec(
      'CREATE TEMP TABLE import_tag_names (name TEXT COLLATE NOCASE UNIQUE, id TEXT NOT NULL)'
    );
  }

  find(name: string): string | undefined {
    const row = this.database
      .prepare('SELECT id FROM temp.import_tag_names WHERE name = ? COLLATE NOCASE')
      .get(name);

    return row === undefined ? undefined : String(row['id']);
  }

  add(name: string, id: string): void {
    this.database
      .prepare('INSERT INTO temp.import_tag_names (name, id) VALUES (?, ?)')
      .run(name, id);
  }

  close(): void {
    this.database.exec('DROP TABLE temp.import_tag_names');
  }
}
