import { DatabaseSync } from 'node:sqlite';

import { migrate, migrations } from '../storage/migrations';

/** Owned historical database, opened through the real storage service by the flow. */
export function seedLegacyQueue(filename: string): void {
  const db = new DatabaseSync(filename);
  const timestamp = '2026-10-10T00:00:00.000Z';

  try {
    migrate(db, migrations.slice(0, 5));
    const insert = db.prepare(
      'INSERT INTO queue_items(id,text,textUtf16,createdAt,updatedAt,position) VALUES(?,?,?,?,?,?)'
    );
    const text = ' '.repeat(1_024) + '\0{{constructor}} {{constructor}} {{\u{10400}}}\ud800';

    insert.run(
      '00000000-0000-4000-8000-000000000010',
      text,
      Buffer.from(text, 'utf16le'),
      timestamp,
      timestamp,
      0
    );
    insert.run(
      '00000000-0000-4000-8000-000000000011',
      '\0' + Array.from({ length: 33 }, (_, index) => `{{v${String(index)}}}`).join(' '),
      null,
      timestamp,
      timestamp,
      1
    );
  } finally {
    db.close();
  }
}
