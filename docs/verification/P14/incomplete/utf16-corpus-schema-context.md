# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: search.spec.ts >> 10k input-to-painted React results via named IPC and the packaged worker
- Location: tests\e2e\search.spec.ts:15:1

# Error details

```
Error: table snippets has 10 columns but 9 values were supplied
```

# Test source

```ts
  1  | import { createHash } from 'node:crypto';
  2  | import { statSync } from 'node:fs';
  3  | import { DatabaseSync } from 'node:sqlite';
  4  | 
  5  | import { migrate } from '../../src/main/storage/migrations';
  6  | 
  7  | export function searchCorpusText(index: number): string {
  8  |   return `Prompt ${String(index)}: ${'review code and improve this test; '.repeat(20)}${index % 97 === 0 ? '👋İΣ 你好 a%b_c (x)* prefix\u0000END' : ''} needle-${String(index)}`;
  9  | }
  10 | 
  11 | export function seedSearchCorpus(filename: string) {
  12 |   const db = new DatabaseSync(filename);
  13 | 
  14 |   migrate(db);
> 15 |   const write = db.prepare('INSERT INTO snippets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
     |                    ^ Error: table snippets has 10 columns but 9 values were supplied
  16 |   const timestamp = '2026-10-02T00:00:00.000Z';
  17 |   let characters = 0;
  18 | 
  19 |   db.exec('BEGIN IMMEDIATE');
  20 |   for (let index = 0; index < 10_000; index += 1) {
  21 |     const text = searchCorpusText(index);
  22 |     const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
  23 | 
  24 |     characters += text.length;
  25 |     write.run(
  26 |       id,
  27 |       text,
  28 |       createHash('sha256').update(text).digest('hex'),
  29 |       timestamp,
  30 |       timestamp,
  31 |       index % 2 === 0 ? 'Windows Terminal' : 'Cursor',
  32 |       index % 2 === 0 ? 'terminal.exe' : 'Cursor.exe',
  33 |       null,
  34 |       index % 4
  35 |     );
  36 |   }
  37 | 
  38 |   db.exec('COMMIT');
  39 |   db.close();
  40 |   return { count: 10_000, characters, databaseBytes: statSync(filename).size };
  41 | }
  42 | 
```