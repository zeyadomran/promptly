import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export async function installerArtifacts(directory, signed = false) {
  const files = (await readdir(directory)).filter(
    (file) => file === 'RELEASES' || file.endsWith('-full.nupkg') || file.endsWith('-Setup.exe')
  );

  if (
    files.length !== 3 ||
    files.filter((file) => file.endsWith('-full.nupkg')).length !== 1 ||
    files.filter((file) => file.endsWith('-Setup.exe')).length !== 1 ||
    !files.includes(signed ? 'Promptly-x64-Setup.exe' : 'Promptly-unsigned-dev-x64-Setup.exe')
  )
    throw new Error(
      'Expected one Windows Setup, full package and RELEASES file for this build mode.'
    );
  return Promise.all(
    files.sort().map(async (file) => {
      const bytes = await readFile(path.join(directory, file));

      return {
        file,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex')
      };
    })
  );
}
