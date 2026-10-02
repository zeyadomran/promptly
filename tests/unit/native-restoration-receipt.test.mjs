import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

import { ensureNativeReceipt, retireNativeReceipt } from '../e2e/native-restoration-receipt';

it('cannot reuse a first process success when the second process never writes restoration', async () => {
  const profile = await mkdtemp(path.join(tmpdir(), 'promptly-restoration-receipt-'));
  const filename = path.join(profile, 'native-preferences-restored.json');

  try {
    await writeFile(filename, JSON.stringify({ restorationOk: true, launch: 1 }));
    const retainedFirst = await readFile(filename, 'utf8');

    await retireNativeReceipt(profile);
    await expect(readFile(filename)).rejects.toMatchObject({ code: 'ENOENT' });
    await ensureNativeReceipt(profile, 'second-process-exited');
    expect(JSON.parse(await readFile(filename, 'utf8'))).toMatchObject({
      restorationOk: false,
      status: 'missing',
      stage: 'second-process-exited'
    });
    expect(JSON.parse(retainedFirst)).toMatchObject({ restorationOk: true, launch: 1 });
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
});
