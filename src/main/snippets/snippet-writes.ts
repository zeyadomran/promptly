import { createHash, randomUUID } from 'node:crypto';

import type { Snippet } from '../../shared/contracts/domain';
import { AssetRepository } from '../attachments/repository';
import { StorageError } from '../storage/context';
import type { StorageRequest } from '../storage/protocol';
import type { SnippetReader } from './snippet-reader';

export function textHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export class SnippetWrites {
  constructor(readonly reader: SnippetReader) {}

  insert(snippet: Snippet): void {
    this.reader.context.db
      .prepare(
        `INSERT INTO snippets
        (id, text, textHash, createdAt, updatedAt, sourceApp, sourceAppId, lastCopiedAt, copyCount, textUtf16)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        snippet.id,
        snippet.text,
        textHash(snippet.text),
        snippet.createdAt,
        snippet.updatedAt,
        snippet.sourceApp,
        snippet.sourceAppId,
        snippet.lastCopiedAt,
        snippet.copyCount,
        Buffer.from(snippet.text, 'utf16le')
      );
    new AssetRepository(this.reader.context).replace(
      { kind: 'snippet', id: snippet.id },
      snippet.attachments
    );
    for (const tag of snippet.tags)
      this.reader.context.db
        .prepare('INSERT INTO snippet_tags VALUES (?, ?)')
        .run(snippet.id, tag.id);
  }

  create(
    input: StorageRequest<'createSnippet'>,
    sourceApp: string | null = null,
    sourceAppId: string | null = null
  ) {
    const now = this.reader.context.now().toISOString();
    const id = randomUUID();

    this.insert({
      id,
      text: input.text,
      sourceApp,
      sourceAppId,
      createdAt: now,
      updatedAt: now,
      tags: [],
      attachments:
        input.draftToken === undefined
          ? []
          : new AssetRepository(this.reader.context).draft(input.draftToken).attachments,
      lastCopiedAt: null,
      copyCount: 0
    });
    this.content(id, input);
    return this.reader.snapshot(id);
  }

  private content(id: string, input: StorageRequest<'createSnippet'>): void {
    const { context } = this.reader;

    if (input.tagIds !== undefined) {
      context.db.prepare('DELETE FROM snippet_tags WHERE snippetId=?').run(id);
      [...new Set(input.tagIds)].forEach((tag) =>
        context.db.prepare('INSERT INTO snippet_tags VALUES(?,?)').run(id, tag)
      );
    }

    const assets = new AssetRepository(context);

    if (input.draftToken !== undefined) {
      assets.replace({ kind: 'snippet', id }, assets.draft(input.draftToken).attachments);
      assets.discard(input.draftToken);
    }

    if (input.text.trim() === '' && assets.list({ kind: 'snippet', id }).length === 0)
      throw new StorageError('INVALID_REQUEST', 'Add text or an attachment before saving.');
  }

  capture(input: StorageRequest<'captureSnippet'>) {
    const row = this.reader.context.db
      .prepare(
        'SELECT id FROM snippets WHERE textHash = ? AND text = ? ORDER BY updatedAt DESC, id ASC'
      )
      .all(textHash(input.text), input.text)
      .find((candidate) => this.reader.get(String(candidate['id'])).text === input.text);

    if (row === undefined)
      return {
        status: 'saved' as const,
        ...this.create(input, input.sourceApp, input.sourceAppId)
      };
    const id = String(row['id']);

    const now = this.reader.context.now().toISOString();

    if (input.sourceApp === null && input.sourceAppId === null) {
      this.reader.context.db.prepare('UPDATE snippets SET updatedAt = ? WHERE id = ?').run(now, id);
    } else {
      this.reader.context.db
        .prepare('UPDATE snippets SET updatedAt = ?, sourceApp = ?, sourceAppId = ? WHERE id = ?')
        .run(now, input.sourceApp, input.sourceAppId, id);
    }

    return { status: 'duplicate' as const, ...this.reader.snapshot(id) };
  }

  update(input: StorageRequest<'updateSnippet'>) {
    this.reader.get(input.id);
    this.reader.context.db
      .prepare(
        'UPDATE snippets SET text = ?, textHash = ?, updatedAt = ?, textUtf16 = ? WHERE id = ?'
      )
      .run(
        input.text,
        textHash(input.text),
        this.reader.context.now().toISOString(),
        Buffer.from(input.text, 'utf16le'),
        input.id
      );
    this.content(input.id, input);
    return this.reader.snapshot(input.id);
  }

  duplicate(input: StorageRequest<'duplicateSnippet'>) {
    const original = this.reader.get(input.id);
    const now = this.reader.context.now().toISOString();
    const id = randomUUID();

    this.insert({
      ...original,
      id,
      createdAt: now,
      updatedAt: now,
      lastCopiedAt: null,
      copyCount: 0
    });
    return this.reader.snapshot(id);
  }

  recordCopy(input: StorageRequest<'recordSuccessfulCopy'>) {
    this.reader.get(input.id);
    this.reader.context.db
      .prepare('UPDATE snippets SET lastCopiedAt = ?, copyCount = copyCount + 1 WHERE id = ?')
      .run(this.reader.context.now().toISOString(), input.id);
    return this.reader.snapshot(input.id);
  }
}
