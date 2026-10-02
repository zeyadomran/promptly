// @vitest-environment node
import { DatabaseSync } from 'node:sqlite';

import { expect, it } from 'vitest';

it('evaluates SQLite LIKE/lower/length and trigram short/NUL behavior on the actual runtime', () => {
  const db = new DatabaseSync(':memory:');

  try {
    const builtins = db
      .prepare('SELECT length(?) AS length, lower(?) AS lower, ? LIKE ? AS wildcard')
      .get('pre\u0000end', 'İΣ你好', 'anything', '%');

    expect(builtins).toMatchObject({ length: 3, lower: 'İΣ你好', wildcard: 1 });
    db.exec("CREATE VIRTUAL TABLE trigram USING fts5(text, tokenize='trigram');");
    db.prepare('INSERT INTO trigram(text) VALUES (?)').run('prefix\u0000END 你好');
    const match = db.prepare('SELECT rowid FROM trigram WHERE trigram MATCH ?');

    expect(match.all('pre')).toHaveLength(1);
    expect(match.all('p')).toHaveLength(0);
    expect(match.all('pr')).toHaveLength(0);
    expect(match.all('END')).toHaveLength(1);
  } finally {
    db.close();
  }
});
