import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { writeWindowsIcon } from './write-windows-icon.mjs';

// Render the supplied geometry without modifying its provenance-bearing source.
const source = await readFile('src/renderer/assets/brand/logo.svg', 'utf8');
const geometry = source.replace(/<metadata>[\s\S]*?<\/metadata>/, '');

await writeWindowsIcon(
  geometry,
  path.resolve('out/brand-assets/promptly'),
  [16, 24, 32, 48, 64, 128, 256]
);
