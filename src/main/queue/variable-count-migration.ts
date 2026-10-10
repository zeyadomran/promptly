import type { DatabaseSync } from 'node:sqlite';

import { countTemplateNames } from '../../shared/workflows/variable-count';
import { decodeSnippetText } from '../storage/sql-text';

/** Register on every open because persisted triggers execute on every text writer. */
export function installQueueVariableCount(db: DatabaseSync): void {
  db.function('promptly_variable_count', { deterministic: true }, (utf16, utf8) => {
    const text = decodeSnippetText(utf16, utf8);

    if (text === null) throw new Error('Invalid queued text.');
    return countTemplateNames(text);
  });
}

export const queueVariableCountMigration = `
ALTER TABLE queue_items ADD COLUMN variableCount INTEGER NOT NULL DEFAULT 0 CHECK(variableCount BETWEEN 0 AND 33);
UPDATE queue_items SET variableCount=promptly_variable_count(textUtf16,CAST(text AS BLOB));
CREATE TRIGGER queue_variables_insert AFTER INSERT ON queue_items BEGIN
  UPDATE queue_items SET variableCount=promptly_variable_count(NEW.textUtf16,CAST(NEW.text AS BLOB)) WHERE id=NEW.id;
END;
CREATE TRIGGER queue_variables_update AFTER UPDATE OF text,textUtf16 ON queue_items BEGIN
  UPDATE queue_items SET variableCount=promptly_variable_count(NEW.textUtf16,CAST(NEW.text AS BLOB)) WHERE id=NEW.id;
END;`;
