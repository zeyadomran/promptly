// @vitest-environment node
import { mkdir, mkdtemp, rm, symlink, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

import { assertProfileIdentity } from '../profile-identity';

it('accepts a symlink/junction to the exact profile and rejects a different existing directory', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'promptly-profile-identity-'));
  const target = path.join(temporary, 'profile');
  const alias = path.join(temporary, 'alias');
  const different = path.join(temporary, 'different');

  await mkdir(target);
  await mkdir(different);
  await symlink(target, alias, process.platform === 'win32' ? 'junction' : 'dir');
  try {
    const receipt = await assertProfileIdentity(alias, target);

    expect(receipt.actual).not.toBe(receipt.expected);
    expect(receipt.actualCanonical).toBe(receipt.expectedCanonical);
    await expect(assertProfileIdentity(different, target)).rejects.toThrow(
      'Packaged test profile was not isolated:'
    );
  } finally {
    // Unlink the alias itself before recursively removing only our own temporary tree.
    await unlink(alias);
    await rm(temporary, { recursive: true, force: true });
  }
});
