import { writeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BrowserWindow,
  clipboard,
  ClipboardItem,
  dialog,
  nativeImage,
  webContents
} from 'electron';

import { assetLimits } from '../../shared/contracts/attachments';
import { atomicExport } from '../storage/transfer/atomic-export';
import { validateExportDestination } from '../storage/transfer/export-destination';
import type { TransferDialogs } from '../storage/transfer/native-dialogs';
import type { TransferOwner } from '../storage/transfer/requests';
import { attachmentName, readAttachmentFiles } from './file-intake';
import { imageHeader, previewable } from './image-header';
import type { AssetEffects } from './ports';
import { RasterDecoder } from './raster-decoder';

function parent(owner: TransferOwner) {
  const contents = webContents.fromId(owner.id);
  const window = contents === undefined ? null : BrowserWindow.fromWebContents(contents);

  if (!owner.isAlive() || window === null || window.isDestroyed())
    throw new Error('The attachment window closed.');
  return window;
}

export function desktopAssetEffects(dialogs: TransferDialogs): AssetEffects {
  const decoder = new RasterDecoder();
  let closing = false;
  const saves = new Set<AbortController>();
  const alive = () => {
    if (closing) throw new Error('Attachment effects closed');
  };

  return {
    close: async () => {
      closing = true;
      for (const controller of saves) controller.abort();
      await decoder.close();
    },
    owner: dialogs.owner,
    choose: async (owner) => {
      const result = await dialog.showOpenDialog(parent(owner), {
        title: 'Attach files',
        properties: ['openFile', 'multiSelections', 'dontAddToRecent']
      });

      alive();
      if (result.canceled) return [];
      if (result.filePaths.length > assetLimits.count)
        throw new Error('Select up to eight attachments.');
      return readAttachmentFiles(result.filePaths, () => {
        alive();
        if (!owner.isAlive()) throw new Error('The draft window closed.');
      });
    },
    dropped: (paths) => readAttachmentFiles(paths, alive),
    paste: async () => {
      alive();
      const items = await clipboard.read();

      alive();

      for (const item of items)
        if (item.types.includes('image/png')) {
          const blob = await item.getType('image/png');

          if (blob.size < 1 || blob.size > assetLimits.bytes)
            return {
              files: [],
              rejected: [{ name: 'Pasted image.png', reason: 'Choose an image up to 10 MiB.' }]
            };
          const bytes = new Uint8Array(await blob.arrayBuffer());

          return [{ name: 'Pasted image.png', mimeType: 'image/png', bytes }];
        }

      for (const item of items)
        if (item.types.includes('text/uri-list')) {
          const blob = await item.getType('text/uri-list');

          if (blob.size > 65536) throw new Error('Clipboard file list exceeds the limit.');
          const paths = (await blob.text())
            .split(/\r?\n/u)
            .filter((line) => line !== '' && !line.startsWith('#'))
            .map((line) => new URL(line))
            .filter((url) => url.protocol === 'file:')
            .map((url) => fileURLToPath(url));

          if (paths.length > assetLimits.count) throw new Error('Paste up to eight attachments.');
          return readAttachmentFiles(paths, alive);
        }

      return [];
    },
    raster: (bytes, edge) => decoder.raster(bytes, edge),
    copyPng: async (bytes) => {
      alive();
      if (!previewable(imageHeader(bytes))) throw new Error('Unsafe image.');
      const image = nativeImage.createFromBuffer(Buffer.from(bytes));

      if (image.isEmpty()) throw new Error('Damaged image.');
      await clipboard.write([
        new ClipboardItem({ 'image/png': new Blob([new Uint8Array(bytes)]) })
      ]);
    },
    save: async (owner, name, bytes) => {
      const result = await dialog.showSaveDialog(parent(owner), {
        title: 'Save attachment copy',
        defaultPath: attachmentName(name),
        properties: ['dontAddToRecent']
      });

      alive();
      if (!owner.isAlive()) throw new Error('Attachment window closed');
      if (result.canceled) return { status: 'cancelled' };
      const destination = result.filePath,
        controller = new AbortController(),
        stop = owner.onClose(() => {
          controller.abort();
        });

      saves.add(controller);
      try {
        await validateExportDestination(destination, dialogs.protectedFiles);
        await atomicExport(
          destination,
          (descriptor) => {
            let offset = 0;

            while (offset < bytes.byteLength) offset += writeSync(descriptor, bytes, offset);
            return Promise.resolve();
          },
          controller.signal,
          () => validateExportDestination(destination, dialogs.protectedFiles)
        );
        return { status: 'saved', filename: path.basename(destination) };
      } finally {
        stop();
        saves.delete(controller);
      }
    }
  };
}
