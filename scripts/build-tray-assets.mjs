import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { writeWindowsIcon } from './write-windows-icon.mjs';

// Geometry comes from the supplied template; its original provenance asset is unchanged.
const source = await readFile('src/renderer/assets/brand/tray-icon-template.svg', 'utf8');
const geometry = source.replace(/<metadata>[\s\S]*?<\/metadata>/, '');
const destination = path.resolve('out/tray-assets');
const sizes = [16, 20, 24, 32, 40, 48, 64];

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
    const name = `tray-${dark ? 'dark' : 'light'}${paused ? '-paused' : ''}`;

    await writeWindowsIcon(svg, path.join(destination, name), sizes);
  }
}
