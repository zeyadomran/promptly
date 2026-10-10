import { AssetRepository } from '../attachments/repository';
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

    const assets = new AssetRepository(context);

    assets.retainUndo(token, snippet.attachments);
    assets.replace({ kind: 'snippet', id: input.id }, []);
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
    const tags = snippet.tags.filter(
      (tag) => context.db.prepare('SELECT id FROM tags WHERE id = ?').get(tag.id) !== undefined
    );

    this.writes.insert({ ...snippet, tags });
    new AssetRepository(context).releaseUndo(input.undoToken);
    context.afterCommit(() => {
      context.undo.remove(input.undoToken);
    });
    return this.writes.reader.snapshot(snippet.id);
  }

  clear() {
    const { context } = this.writes.reader;

    context.db.exec(
      'DELETE FROM content_assets; DELETE FROM drafts; DELETE FROM asset_undo; DELETE FROM queue_undo; DELETE FROM queue_items; DELETE FROM snippets; DELETE FROM tags;'
    );
    context.afterCommit(() => {
      context.undo.clear();
    });
    return { revision: context.revision() };
  }
}
