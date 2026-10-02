import type { DatabaseSync } from 'node:sqlite';

/** TEMP state belongs to this worker and rolls back with the authoritative write. */
export function installSearchChangeLog(db: DatabaseSync): void {
  db.exec(`
    CREATE TEMP TABLE search_dirty (id TEXT PRIMARY KEY);
    CREATE TEMP TRIGGER search_insert AFTER INSERT ON main.snippets BEGIN
      INSERT OR IGNORE INTO search_dirty VALUES (new.id); END;
    CREATE TEMP TRIGGER search_update AFTER UPDATE ON main.snippets BEGIN
      INSERT OR IGNORE INTO search_dirty VALUES (old.id);
      INSERT OR IGNORE INTO search_dirty VALUES (new.id); END;
    CREATE TEMP TRIGGER search_delete AFTER DELETE ON main.snippets BEGIN
      INSERT OR IGNORE INTO search_dirty VALUES (old.id); END;
    CREATE TEMP TRIGGER search_relation_insert AFTER INSERT ON main.snippet_tags BEGIN
      INSERT OR IGNORE INTO search_dirty VALUES (new.snippetId); END;
    CREATE TEMP TRIGGER search_relation_delete AFTER DELETE ON main.snippet_tags BEGIN
      INSERT OR IGNORE INTO search_dirty VALUES (old.snippetId); END;
    CREATE TEMP TRIGGER search_relation_update AFTER UPDATE ON main.snippet_tags BEGIN
      INSERT OR IGNORE INTO search_dirty VALUES (old.snippetId);
      INSERT OR IGNORE INTO search_dirty VALUES (new.snippetId); END;
    CREATE TEMP TRIGGER search_tag_update AFTER UPDATE ON main.tags BEGIN
      INSERT OR IGNORE INTO search_dirty SELECT snippetId FROM snippet_tags WHERE tagId = new.id;
    END;
  `);
}
