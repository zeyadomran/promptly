import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Resvg } from '@resvg/resvg-js';

/** PNG-backed ICO entries support Windows shell/tray DPI selection, including 256px. */
export async function writeWindowsIcon(svg, basename, sizes) {
  const images = sizes.map((size) =>
    new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  );
  const header = Buffer.alloc(6 + sizes.length * 16);

  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;

  for (const [index, image] of images.entries()) {
    const entry = 6 + index * 16;
    const size = sizes[index];

    header[entry] = size === 256 ? 0 : size;
    header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  }

  await mkdir(path.dirname(basename), { recursive: true });
  await writeFile(`${basename}.ico`, Buffer.concat([header, ...images]));
  await writeFile(`${basename}.png`, images.at(-1));
}
