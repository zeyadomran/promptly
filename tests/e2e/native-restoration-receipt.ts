import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const filename = (profile: string) => path.join(profile, 'native-preferences-restored.json');

/** A prior process's successful readback cannot qualify a later launch. */
export function retireNativeReceipt(profile: string) {
  return rm(filename(profile), { force: true });
}

export async function ensureNativeReceipt(profile: string, stage: string) {
  await readFile(filename(profile)).catch(async () => {
    await writeFile(
      filename(profile),
      JSON.stringify({ restorationOk: false, status: 'missing', nativeState: 'unknown', stage })
    );
  });
}
