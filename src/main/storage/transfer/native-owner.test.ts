// @vitest-environment node
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { LibraryMutations } from '../library-mutations';
import { nativeTransferDialogs } from './native-dialogs';
import { StorageTransfer } from './service';
import { transferStore } from './transfer-test-fixture';

const native = vi.hoisted(() => ({
  contents: undefined as (EventEmitter & { id: number; isDestroyed: () => boolean }) | undefined,
  window: { isDestroyed: () => false },
  save: vi.fn<() => Promise<Electron.SaveDialogReturnValue>>(),
  open: vi.fn<() => Promise<Electron.OpenDialogReturnValue>>()
}));

vi.mock('electron', () => ({
  webContents: { fromId: () => native.contents },
  BrowserWindow: { fromWebContents: () => native.window },
  dialog: { showSaveDialog: native.save, showOpenDialog: native.open },
  shell: { showItemInFolder: vi.fn() }
}));
let store: ReturnType<typeof transferStore>;
let service: StorageTransfer;

beforeEach(() => {
  store = transferStore();
  native.contents = Object.assign(new EventEmitter(), { id: 1, isDestroyed: () => false });
  vi.clearAllMocks();
  service = new StorageTransfer(
    store.port,
    new LibraryMutations(),
    nativeTransferDialogs(path.dirname(store.file), store.filename)
  );
});
afterEach(async () => {
  await service.close();
  store.dispose();
});

it.each(['render-process-gone', 'destroyed'])(
  'retires an owner on %s and ignores a late native export path',
  async (event) => {
    let resolve: ((result: Electron.SaveDialogReturnValue) => void) | undefined;

    native.save.mockImplementation(
      () =>
        new Promise((finish) => {
          resolve = finish;
        })
    );
    const output = path.join(path.dirname(store.file), 'late-export.json');
    const owner = nativeTransferDialogs(path.dirname(store.file), store.filename).owner(1);
    const stop = owner?.onClose(() => undefined);
    const exporting = service.services.exportLibrary({ format: 'json' }, { senderId: 1 });

    await vi.waitFor(() => {
      expect(native.save).toHaveBeenCalledOnce();
    });
    native.contents?.emit(event, {}, { reason: 'crashed', exitCode: 1 });
    expect(owner?.isAlive()).toBe(false);
    expect(await exporting).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
    resolve?.({ canceled: false, filePath: output });
    await Promise.resolve();
    expect(existsSync(output)).toBe(false);
    expect(store.engine.context.revision()).toBe(0);
    stop?.();
  }
);

it('does not open a dialog on a replacement document after navigation during preview retirement', async () => {
  const snippet = store.invoke('createSnippet', { text: 'owned' }).snippet;

  store.prepare(store.export());
  native.open.mockResolvedValue({ canceled: false, filePaths: [store.file] });
  const preview = await service.services.previewLibraryImport({}, { senderId: 1 });

  expect(preview.ok).toBe(true);
  const original = store.port.call.bind(store.port);
  let resolve: (() => void) | undefined;
  const deferred = new Promise<void>((finish) => {
    resolve = finish;
  });

  vi.spyOn(store.port, 'call').mockImplementation(async (operation, input) => {
    if (operation === 'discardLibraryImport') await deferred;
    return original(operation, input);
  });
  const second = service.services.previewLibraryImport({}, { senderId: 1 });

  await Promise.resolve();
  native.contents?.emit('did-start-navigation', {}, 'file:///replacement.html', false, true);
  resolve?.();
  expect(await second).toMatchObject({ ok: false, error: { code: 'UNAVAILABLE' } });
  expect(native.open).toHaveBeenCalledOnce();
  expect(store.invoke('getSnippet', { id: snippet.id }).snippet.text).toBe('owned');
});
