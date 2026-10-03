import { existsSync } from 'node:fs';

import type { SignToolOptions } from '@electron/windows-sign';

export const signedRelease = process.env['PROMPTLY_SIGN_RELEASE'] === 'true';

function requiredFile(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.length === 0 || !existsSync(value))
    throw new Error(`Signed releases require an existing ${name} file.`);
  return value;
}

export function releaseSigning(): SignToolOptions | undefined {
  if (!signedRelease) return undefined;
  return {
    signToolPath: requiredFile('SIGNTOOL_PATH'),
    signWithParams: [
      '/v',
      '/dlib',
      requiredFile('AZURE_CODE_SIGNING_DLIB'),
      '/dmdf',
      requiredFile('AZURE_METADATA_JSON')
    ],
    timestampServer: 'http://timestamp.acs.microsoft.com',
    // windows-sign exports its enum as a string-key type, while options retain the private enum.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment
    hashes: ['sha256'] as NonNullable<SignToolOptions['hashes']>
  };
}
