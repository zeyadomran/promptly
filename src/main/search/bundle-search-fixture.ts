import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SnippetDelete } from '../snippets/snippet-delete';
import { SnippetReader } from '../snippets/snippet-reader';
import { SnippetWrites } from '../snippets/snippet-writes';
import { TagRepository } from '../snippets/tag-repository';
import { StorageContext } from '../storage/context';

export function bundleSearchFixture() {
  const directory = mkdtempSync(path.join(tmpdir(), 'promptly-bundle-filter-'));
  const filename = path.join(directory, 'data.sqlite');
  let context = new StorageContext(filename);
  let reader = new SnippetReader(context);

  return {
    get search() {
      return reader;
    },
    create(text: string, sourceApp: string | null = null) {
      return context.transaction(() => new SnippetWrites(reader).create({ text }, sourceApp));
    },
    tag(name: string) {
      return context.transaction(() => new TagRepository(reader).create({ name })).tag;
    },
    setTags(id: string, tagIds: string[]) {
      context.transaction(() => new TagRepository(reader).set({ id, tagIds }));
    },
    update(id: string, text: string) {
      context.transaction(() => new SnippetWrites(reader).update({ id, text }));
    },
    delete(id: string) {
      context.transaction(() => new SnippetDelete(new SnippetWrites(reader)).delete({ id }));
    },
    reopen() {
      context.db.close();
      context = new StorageContext(filename);
      reader = new SnippetReader(context);
    },
    dispose() {
      context.db.close();
      rmSync(directory, { recursive: true, force: true });
    }
  };
}
