import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { migrate } from '../../src/main/storage/migrations';

export function searchCorpusText(index: number): string {
  return `Prompt ${String(index)}: ${'review code and improve this test; '.repeat(20)}${index % 97 === 0 ? '👋İΣ 你好 a%b_c (x)* prefix\u0000END' : ''} needle-${String(index)}`;
}

export function seedSearchCorpus(filename: string) {
  const db = new DatabaseSync(filename);

  migrate(db);
  const write = db.prepare('INSERT INTO snippets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const timestamp = '2026-10-02T00:00:00.000Z';
  let characters = 0;

  db.exec('BEGIN IMMEDIATE');
  for (let index = 0; index < 10_000; index += 1) {
    const text = searchCorpusText(index);
    const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;

    characters += text.length;
    write.run(
      id,
      text,
      createHash('sha256').update(text).digest('hex'),
      timestamp,
      timestamp,
      index % 2 === 0 ? 'Windows Terminal' : 'Cursor',
      index % 2 === 0 ? 'terminal.exe' : 'Cursor.exe',
      null,
      index % 4
    );
  }

  db.exec('COMMIT');
  db.close();
  return { count: 10_000, characters, databaseBytes: statSync(filename).size };
}
