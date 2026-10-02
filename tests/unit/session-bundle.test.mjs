// @vitest-environment node
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

import { expect, test } from 'vitest';

import { copySessionBundle } from '../e2e/session-bundle';

// Native relative framework symlink semantics are required on the hosted macOS lane.
test.skipIf(process.platform === 'win32')(
  'copied framework links remain within the owned bundle after original moves',
  async () => {
    const directory = await realpath(await mkdtemp(path.join(tmpdir(), 'promptly-owned-bundle-')));
    const source = path.join(directory, 'source');
    const copied = path.join(directory, 'copy');
    const resource = 'Versions/A/Resources';

    try {
      await mkdir(path.join(source, resource), { recursive: true });
      await writeFile(path.join(source, resource, 'icudtl.dat'), 'owned ICU sentinel');
      await symlink('A', path.join(source, 'Versions/Current'));
      await symlink('Versions/Current/Resources', path.join(source, 'Resources'));
      await copySessionBundle(source, copied);
      await rename(source, path.join(directory, 'original-moved'));
      expect(await readlink(path.join(copied, 'Versions/Current'))).toBe('A');
      expect(await readlink(path.join(copied, 'Resources'))).toBe('Versions/Current/Resources');
      const actual = await realpath(path.join(copied, 'Resources/icudtl.dat'));
      const canonicalCopy = await realpath(copied);

      expect(path.relative(canonicalCopy, actual).split(path.sep)[0]).not.toBe('..');
      expect(actual).toBe(path.join(canonicalCopy, resource, 'icudtl.dat'));
      expect(await readFile(actual, 'utf8')).toBe('owned ICU sentinel');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
);
