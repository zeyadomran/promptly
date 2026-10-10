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
import { attachmentName, readAttachmentFile } from './file-intake';
import { imageHeader, previewable } from './image-header';
import type { AssetEffects } from './ports';

function parent(owner: TransferOwner) {
  const contents = webContents.fromId(owner.id);
  const window = contents === undefined ? null : BrowserWindow.fromWebContents(contents);

  if (!owner.isAlive() || window === null || window.isDestroyed())
    throw new Error('The attachment window closed.');
  return window;
}

export function desktopAssetEffects(dialogs: TransferDialogs): AssetEffects {
  return {
    owner: dialogs.owner,
    choose: async (owner) => {
      const result = await dialog.showOpenDialog(parent(owner), {
        title: 'Attach files',
        properties: ['openFile', 'multiSelections', 'dontAddToRecent']
      });

      if (result.canceled) return [];
      if (result.filePaths.length > assetLimits.count)
        throw new Error('Select up to eight attachments.');
      const files = [];

      for (const file of result.filePaths) {
        if (!owner.isAlive()) throw new Error('The draft window closed.');
        files.push(await readAttachmentFile(file));
      }

      return files;
    },
    dropped: async (paths) => {
      const files = [];

      for (const file of paths) {
        if (!path.isAbsolute(file)) throw new Error('Not an absolute native path.');
        files.push(await readAttachmentFile(file));
      }

      return files;
    },
    paste: async () => {
      const items = await clipboard.read();

      for (const item of items)
        if (item.types.includes('image/png')) {
          const blob = await item.getType('image/png');

          if (blob.size < 1 || blob.size > assetLimits.bytes)
            throw new Error('Clipboard image exceeds 10 MiB.');
          const bytes = new Uint8Array(await blob.arrayBuffer());

          if (!previewable(imageHeader(bytes)))
            throw new Error('Clipboard image exceeds safe dimensions.');
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
          const files = [];

          for (const file of paths) files.push(await readAttachmentFile(file));
          return files;
        }

      return [];
    },
    raster: (bytes, edge) => {
      const dimensions = imageHeader(bytes);

      if (!previewable(dimensions)) throw new Error('Unsafe image dimensions.');
      let image = nativeImage.createFromBuffer(Buffer.from(bytes));

      if (image.isEmpty()) throw new Error('Damaged image.');
      if (
        image.getSize().width !== dimensions.width ||
        image.getSize().height !== dimensions.height
      )
        throw new Error('Image header mismatch.');
      let limit = edge;

      for (;;) {
        const factor = Math.min(1, limit / Math.max(dimensions.width, dimensions.height));
        const width = Math.max(1, Math.round(dimensions.width * factor)),
          height = Math.max(1, Math.round(dimensions.height * factor));

        image = image.resize({ width, height, quality: 'good' });
        const png = image.toPNG();

        if (png.byteLength <= assetLimits.bytes) return { png: new Uint8Array(png), width, height };
        if (limit <= 128) throw new Error('Unable to produce bounded raster.');
        limit = Math.floor(limit / 2);
      }
    },
    copyPng: async (bytes) => {
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

      if (result.canceled) return { status: 'cancelled' };
      const destination = result.filePath,
        controller = new AbortController(),
        stop = owner.onClose(() => {
          controller.abort();
        });

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
      }
    }
  };
}
