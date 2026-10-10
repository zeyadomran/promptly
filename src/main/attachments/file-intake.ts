import { open } from 'node:fs/promises';
import path from 'node:path';

import { assetLimits } from '../../shared/contracts/attachments';
import type { AssetIntake, AssetIntakeBatch } from './ports';

export class AttachmentIntakeError extends Error {}

export function attachmentName(name: string): string {
  return (
    Array.from(name, (character) => (character.charCodeAt(0) < 32 ? '_' : character))
      .join('')
      .replace(/[\\/:]/gu, '_')
      .replace(/[. ]+$/u, '')
      .slice(0, 255) || 'Attachment'
  );
}

export async function readAttachmentFile(filename: string): Promise<AssetIntake> {
  const handle = await open(filename, 'r');

  try {
    const stat = await handle.stat();

    if (!stat.isFile()) throw new AttachmentIntakeError('Only regular files can be attached.');
    if (stat.size < 1) throw new AttachmentIntakeError('The file is empty.');
    if (stat.size > assetLimits.bytes)
      throw new AttachmentIntakeError(
        `${String(Math.ceil(stat.size / 1024 / 1024))} MiB exceeds the 10 MiB attachment limit.`
      );
    const bytes = new Uint8Array(stat.size);
    let offset = 0;

    while (offset < bytes.byteLength) {
      const read = await handle.read(bytes, offset, bytes.byteLength - offset, offset);

      if (read.bytesRead === 0) throw new AttachmentIntakeError('File changed during intake.');
      offset += read.bytesRead;
    }

    if ((await handle.read(new Uint8Array(1), 0, 1, offset)).bytesRead !== 0)
      throw new AttachmentIntakeError('File changed during intake.');
    return {
      name: attachmentName(path.basename(filename)),
      bytes,
      mimeType: 'application/octet-stream'
    };
  } finally {
    await handle.close();
  }
}

export async function readAttachmentFiles(
  paths: string[],
  available: () => void = () => undefined
): Promise<AssetIntakeBatch> {
  if (paths.length > assetLimits.count)
    throw new AttachmentIntakeError('Select up to eight attachments.');
  const batch: AssetIntakeBatch = { files: [], rejected: [] };

  for (const filename of paths) {
    available();
    try {
      if (!path.isAbsolute(filename))
        throw new AttachmentIntakeError('The file path is unavailable.');
      batch.files.push(await readAttachmentFile(filename));
    } catch (error) {
      batch.rejected.push({
        name: attachmentName(path.basename(filename)),
        reason: error instanceof AttachmentIntakeError ? error.message : 'Could not read this file.'
      });
    }

    available();
  }

  return batch;
}
