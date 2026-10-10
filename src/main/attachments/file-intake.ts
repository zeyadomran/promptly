import { open } from 'node:fs/promises';
import path from 'node:path';

import { assetLimits } from '../../shared/contracts/attachments';
import type { AssetIntake } from './ports';

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

    if (!stat.isFile() || stat.size < 1 || stat.size > assetLimits.bytes)
      throw new Error('Choose a nonempty regular file up to 10 MiB.');
    const bytes = new Uint8Array(stat.size);
    let offset = 0;

    while (offset < bytes.byteLength) {
      const read = await handle.read(bytes, offset, bytes.byteLength - offset, offset);

      if (read.bytesRead === 0) throw new Error('File changed during intake.');
      offset += read.bytesRead;
    }

    if ((await handle.read(new Uint8Array(1), 0, 1, offset)).bytesRead !== 0)
      throw new Error('File changed during intake.');
    return {
      name: attachmentName(path.basename(filename)),
      bytes,
      mimeType: 'application/octet-stream'
    };
  } finally {
    await handle.close();
  }
}
