import { StorageError } from '../storage/context';
import type { StorageRequest } from '../storage/protocol';
import type { SnippetWrites } from './snippet-writes';

export class SnippetDelete {
  constructor(readonly writes: SnippetWrites) {}

  delete(input: StorageRequest<'deleteSnippet'>) {
    const { context } = this.writes.reader;
    const snippet = this.writes.reader.get(input.id);
    const token = context.undo.token();
    const now = context.now().getTime();

    context.db.prepare('DELETE FROM snippets WHERE id = ?').run(input.id);
    context.afterCommit(() => {
      context.undo.save(token, snippet, now);
    });
    return { revision: context.revision(), undoToken: token };
  }

  undo(input: StorageRequest<'undoDeleteSnippet'>) {
    const { context } = this.writes.reader;
    const snippet = context.undo.get(input.undoToken, context.now().getTime());

    if (snippet === undefined) throw new StorageError('NOT_FOUND', 'Undo expired or unavailable.');
    if (context.db.prepare('SELECT id FROM snippets WHERE id = ?').get(snippet.id) !== undefined)
      throw new StorageError('CONFLICT', 'The deleted snippet cannot be restored.');
    for (const tag of snippet.tags) {
      if (context.db.prepare('SELECT id FROM tags WHERE id = ?').get(tag.id) === undefined)
        throw new StorageError('CONFLICT', 'A deleted tag prevents restoration.');
    }

    this.writes.insert(snippet);
    context.afterCommit(() => {
      context.undo.remove(input.undoToken);
    });
    return this.writes.reader.snapshot(snippet.id);
  }

  clear() {
    const { context } = this.writes.reader;

    context.db.exec('DELETE FROM snippets; DELETE FROM tags;');
    context.afterCommit(() => {
      context.undo.clear();
    });
    return { revision: context.revision() };
  }
}
