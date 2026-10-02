import {
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

import { copyOwnedPackage } from '../e2e/copy-package';

// Relative framework directory symlinks are a macOS topology; Windows junctions cannot model them.
it.skipIf(process.platform === 'win32')(
  'keeps framework links relative and independent of the original bundle',
  async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'promptly-package-links-'));
    const source = path.join(root, 'source');
    const copy = path.join(root, 'copy');

    try {
      await mkdir(path.join(source, 'framework/Versions/A/Resources'), { recursive: true });
      await writeFile(
        path.join(source, 'framework/Versions/A/Resources/icudtl.dat'),
        'owned fixture data'
      );
      await symlink('Versions/A', path.join(source, 'framework/Current'), 'dir');
      await copyOwnedPackage(source, copy);
      expect(await readlink(path.join(copy, 'framework/Current'))).toBe('Versions/A');
      const resource = path.join(copy, 'framework/Current/Resources/icudtl.dat');

      expect(await realpath(resource)).toBe(
        path.join(await realpath(copy), 'framework/Versions/A/Resources/icudtl.dat')
      );
      await rename(source, path.join(root, 'retired-original'));
      expect(await readFile(resource, 'utf8')).toBe('owned fixture data');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
);
