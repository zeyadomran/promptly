import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Resvg } from '@resvg/resvg-js';

// Geometry comes from the supplied template; its original provenance asset is unchanged.
const source = await readFile('src/renderer/assets/brand/tray-icon-template.svg', 'utf8');
const geometry = source.replace(/<metadata>[\s\S]*?<\/metadata>/, '');
const destination = path.resolve('out/tray-assets');
const sizes = [16, 20, 24, 32, 40, 48, 64];

await mkdir(destination, { recursive: true });
for (const dark of [false, true]) {
  for (const paused of [false, true]) {
    const foreground = dark ? '#fff' : '#000';
    const cutout = dark ? '#000' : '#fff';
    let svg = geometry.replaceAll('#000', foreground);

    if (paused)
      svg = svg.replace(
        '</svg>',
        `<g fill="${cutout}"><rect x="11.2" y="8" width="1" height="4"/><rect x="13.3" y="8" width="1" height="4"/></g></svg>`
      );
    const images = sizes.map((size) =>
      new Resvg(svg, {
        fitTo: { mode: 'width', value: size }
      })
        .render()
        .asPng()
    );
    const header = Buffer.alloc(6 + sizes.length * 16);

    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(sizes.length, 4);
    let offset = header.length;

    for (const [index, image] of images.entries()) {
      const entry = 6 + index * 16;
      const size = sizes[index];

      header[entry] = size;
      header[entry + 1] = size;
      header.writeUInt16LE(1, entry + 4);
      header.writeUInt16LE(32, entry + 6);
      header.writeUInt32LE(image.length, entry + 8);
      header.writeUInt32LE(offset, entry + 12);
      offset += image.length;
    }

    const name = `tray-${dark ? 'dark' : 'light'}${paused ? '-paused' : ''}`;

    await writeFile(path.join(destination, `${name}.ico`), Buffer.concat([header, ...images]));
    await writeFile(path.join(destination, `${name}.png`), images.at(-1));
  }
}
