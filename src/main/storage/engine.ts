import type { ChangeEvent } from '../../shared/contracts/domain';
import { failure, resultSchema } from '../../shared/contracts/result';
import { SettingsRepository } from '../settings/repository';
import { SnippetDelete } from '../snippets/snippet-delete';
import { SnippetReader } from '../snippets/snippet-reader';
import { SnippetWrites } from '../snippets/snippet-writes';
import { TagRepository } from '../snippets/tag-repository';
import { StorageContext, StorageError } from './context';
import type { StorageHandlers, StorageOperation, WorkerReply } from './protocol';
import { storageOperations } from './protocol';
import { TransferRepository } from './transfer/repository';

const reads = new Set<StorageOperation>([
  'getSnippet',
  'searchSnippets',
  'listTags',
  'getRevision',
  'getSettings',
  'exportLibraryData',
  'prepareLibraryImport',
  'discardLibraryImport'
]);

export class StorageEngine {
  readonly context: StorageContext;
  private readonly handlers: StorageHandlers;
  private readonly transfer: TransferRepository;

  constructor(filename: string, now?: () => Date) {
    this.context = new StorageContext(filename, now);
    const reader = new SnippetReader(this.context);
    const writes = new SnippetWrites(reader);
    const deletion = new SnippetDelete(writes);
    const transfer = new TransferRepository(writes);

    this.transfer = transfer;
    const tags = new TagRepository(reader);
    let settings: SettingsRepository;

    try {
      settings = new SettingsRepository(this.context);
    } catch (error) {
      this.context.db.close();
      throw error;
    }

    this.handlers = {
      getSettings: () => settings.read(),
      updateSettings: (input) => settings.write(input),
      getSnippet: (input) => reader.snapshot(input.id),
      searchSnippets: (input) => reader.query(input),
      createSnippet: (input) => writes.create(input),
      updateSnippet: (input) => writes.update(input),
      duplicateSnippet: (input) => writes.duplicate(input),
      captureSnippet: (input) => writes.capture(input),
      recordSuccessfulCopy: (input) => writes.recordCopy(input),
      deleteSnippet: (input) => deletion.delete(input),
      undoDeleteSnippet: (input) => deletion.undo(input),
      clearLibrary: () => {
        const result = deletion.clear();

        this.context.afterCommit(() => {
          transfer.clearPlans();
        });
        return result;
      },
      exportLibraryData: (input) => transfer.export(input),
      prepareLibraryImport: (input) => transfer.preview(input),
      commitLibraryImport: (input) => transfer.import(input),
      discardLibraryImport: (input) => transfer.discard(input),
      getRevision: () => ({ revision: this.context.revision() }),
      listTags: () => tags.list(),
      createTag: (input) => tags.create(input),
      ensureTag: (input) => tags.ensure(input),
      setTagMembership: (input) => tags.membership(input),
      updateTag: (input) => tags.update(input),
      deleteTag: (input) => tags.delete(input),
      mergeTags: (input) => tags.merge(input),
      setSnippetTags: (input) => tags.set(input)
    };
  }

  run(id: number, operation: StorageOperation, input: unknown): WorkerReply {
    const schema = storageOperations[operation];
    const request = schema.request.safeParse(input);

    if (!request.success)
      return { id, result: failure('INVALID_REQUEST', 'Invalid storage request.') };
    if (operation === 'captureSnippet' && 'text' in request.data && request.data.text.trim() === '')
      return {
        id,
        result: { ok: true, value: { status: 'empty', revision: this.context.revision() } }
      };
    try {
      // Dispatch remains internal to the worker. Each request is validated before this lookup.
      const handler = this.handlers[operation] as (value: typeof request.data) => unknown;
      const action = () => {
        const value = handler(request.data);

        return resultSchema<unknown>(schema.response).parse({ ok: true, value });
      };

      const result = reads.has(operation) ? action() : this.context.transaction(action);
      const reply: WorkerReply = { id, result };

      if (!reads.has(operation)) reply.change = this.change(operation);
      return reply;
    } catch (error) {
      if (error instanceof StorageError) return { id, result: failure(error.code, error.message) };
      if (
        error instanceof Error &&
        'errcode' in error &&
        typeof error.errcode === 'number' &&
        error.errcode % 256 === 19
      )
        return { id, result: failure('CONFLICT', 'Storage change conflicts with existing data.') };
      return { id, result: failure('INTERNAL', 'The storage operation failed.') };
    }
  }

  close(): void {
    this.transfer.clearPlans();
    this.context.undo.clear();
    this.context.db.close();
  }

  private change(operation: StorageOperation): ChangeEvent {
    if (operation === 'updateSettings')
      return { revision: this.context.revision(), domains: ['settings'] };
    const tagsOnly = operation === 'createTag' || operation === 'updateTag';
    const relationships = [
      'deleteSnippet',
      'undoDeleteSnippet',
      'duplicateSnippet',
      'setSnippetTags',
      'setTagMembership',
      'ensureTag',
      'deleteTag',
      'mergeTags',
      'clearLibrary',
      'commitLibraryImport'
    ];

    return {
      revision: this.context.revision(),
      domains: tagsOnly
        ? ['tags', 'snippets']
        : relationships.includes(operation)
          ? ['snippets', 'tags']
          : ['snippets']
    };
  }
}
