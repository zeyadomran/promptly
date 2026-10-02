import path from 'node:path';

import type { DesktopOperations, OperationResponse } from '../../../shared/contracts/operations';
import { failure } from '../../../shared/contracts/result';
import type { StorageClient } from '../client';
import type { LibraryMutations } from '../library-mutations';
import { atomicExport } from './atomic-export';
import { validateExportDestination } from './export-destination';
import type { TransferDialogs } from './native-dialogs';
import { OwnedPreviews } from './previews';
import { awaitOwnedDialog, TransferRequests } from './requests';

export class StorageTransfer {
  private readonly requests: TransferRequests;
  private readonly previews: OwnedPreviews;

  constructor(
    private readonly storage: Pick<StorageClient, 'call'>,
    private readonly mutations: LibraryMutations,
    private readonly dialogs: TransferDialogs,
    private readonly onReplaced: () => void = () => undefined
  ) {
    this.requests = new TransferRequests(dialogs.owner);
    this.previews = new OwnedPreviews((token) =>
      this.requests.observe(storage.call('discardLibraryImport', { token }))
    );
  }

  readonly services: Pick<
    DesktopOperations,
    | 'getStorageLocation'
    | 'revealStorageLocation'
    | 'exportLibrary'
    | 'previewLibraryImport'
    | 'confirmLibraryImport'
    | 'cancelLibraryImport'
    | 'clearLibrary'
  > = {
    getStorageLocation: (_input, context) =>
      this.requests.run(context, () =>
        Promise.resolve({ ok: true, value: { directory: this.dialogs.directory } })
      ),
    revealStorageLocation: (_input, context) =>
      this.requests.run(context, () => {
        this.dialogs.reveal();
        return Promise.resolve({ ok: true, value: {} });
      }),
    exportLibrary: (input, context) =>
      this.requests.run<OperationResponse<'exportLibrary'>>(context, async (scope) => {
        const filename = await awaitOwnedDialog(
          this.dialogs.save(scope.owner, input.format),
          scope.signal
        );

        scope.signal.throwIfAborted();
        if (filename === undefined) return { ok: true, value: { status: 'cancelled' } };
        await validateExportDestination(filename, this.dialogs.protectedFiles);
        const snapshot = await this.storage.call('exportLibraryData', input);

        if (!snapshot.ok) return snapshot;
        await atomicExport(filename, snapshot.value.data, scope.signal, undefined, () =>
          validateExportDestination(filename, this.dialogs.protectedFiles)
        );
        return {
          ok: true,
          value: {
            status: 'exported',
            revision: snapshot.value.revision,
            filename: path.basename(filename)
          }
        };
      }),
    previewLibraryImport: (_input, context) =>
      this.requests.run<OperationResponse<'previewLibraryImport'>>(context, async (scope) => {
        await this.previews.removeOwner(scope.owner.id);
        scope.signal.throwIfAborted();
        const filename = await awaitOwnedDialog(this.dialogs.open(scope.owner), scope.signal);

        scope.signal.throwIfAborted();
        if (filename === undefined) return { ok: true, value: { status: 'cancelled' } };
        const preview = await this.storage.call('prepareLibraryImport', { filename });

        if (!preview.ok) return preview;
        if (scope.signal.aborted) {
          await this.storage.call('discardLibraryImport', { token: preview.value.token });
          scope.signal.throwIfAborted();
        }

        this.previews.remember(preview.value.token, scope.owner);
        return { ok: true, value: { status: 'preview', preview: preview.value } };
      }),
    confirmLibraryImport: (input, context) =>
      this.requests.run(context, async (scope) => {
        if (!this.previews.belongsTo(input.token, scope.owner))
          return failure('NOT_FOUND', 'This import preview is unavailable. Choose the file again.');
        const result = await this.mutations.barrier(async () => {
          scope.signal.throwIfAborted();
          const committed = await this.storage.call('commitLibraryImport', input);

          if (committed.ok) this.onReplaced();
          return committed;
        });

        if (result.ok || result.error.code === 'CONFLICT' || result.error.code === 'NOT_FOUND')
          await this.previews.forget(input.token);
        return result;
      }),
    cancelLibraryImport: (input, context) =>
      this.requests.run(context, async (scope) => {
        if (!this.previews.belongsTo(input.token, scope.owner))
          return failure('NOT_FOUND', 'This import preview is unavailable.');
        await this.previews.forget(input.token);
        return { ok: true, value: {} };
      }),
    clearLibrary: (_input, context) =>
      this.requests.run(context, async (scope) => {
        const result = await this.mutations.barrier(async () => {
          scope.signal.throwIfAborted();
          const committed = await this.storage.call('clearLibrary', {});

          if (committed.ok) this.onReplaced();
          return committed;
        });

        if (result.ok) await this.previews.clear();
        return result;
      })
  };

  async close(): Promise<void> {
    // Abort dialog/export work first; accepted worker transactions still settle.
    const mutations = this.mutations.close();
    const closing = this.requests.close();

    await this.previews.clear();
    await closing;
    await mutations;
  }
}
