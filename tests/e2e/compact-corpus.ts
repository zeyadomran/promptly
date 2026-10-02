import { createHash } from 'node:crypto';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { seedSearchCorpus } from './search-corpus';

export function seedCompactCorpus(profile: string): void {
  const filename = path.join(profile, 'settings.sqlite');

  seedSearchCorpus(filename);
  const db = new DatabaseSync(filename);

  try {
    const tags = [
      ['ChatGPT', 'blue'],
      ['Code', 'green'],
      ['Research', 'purple'],
      ['Writing', 'amber'],
      ['Terminal', 'teal'],
      ['Work', 'red'],
      ['Personal', 'pink'],
      ['Ideas', 'lime']
    ] as const;
    const insertTag = db.prepare(
      'INSERT INTO tags (id, name, color, createdAt) VALUES (?, ?, ?, ?)'
    );
    const insertMembership = db.prepare(
      'INSERT INTO snippet_tags (snippetId, tagId) VALUES (?, ?)'
    );

    db.exec('BEGIN IMMEDIATE');
    for (const [index, [name, color]] of tags.entries()) {
      const tagId = `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`;

      insertTag.run(tagId, name.toLowerCase(), color, '2026-10-02T00:00:00.000Z');
      for (let item = 0; item < 10_000; item += 1) {
        if (item % 8 === index || (index === 0 && item % 4 === 1))
          insertMembership.run(`00000000-0000-4000-8000-${String(item).padStart(12, '0')}`, tagId);
      }
    }

    const text =
      'Explain this code clearly. Preserve literal <script>alert(1)</script> & Unicode 👋 你好.';

    db.prepare(
      'UPDATE snippets SET text = ?, textHash = ?, textUtf16 = ?, sourceApp = NULL, sourceAppId = NULL WHERE id = ?'
    ).run(
      text,
      createHash('sha256').update(text).digest('hex'),
      Buffer.from(text, 'utf16le'),
      '00000000-0000-4000-8000-000000000000'
    );
    db.exec('COMMIT');
  } finally {
    db.close();
  }
}
