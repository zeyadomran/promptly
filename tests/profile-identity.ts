import { realpath } from 'node:fs/promises';

/** Compare existing directories, including macOS /var aliases and Windows junctions. */
export async function assertProfileIdentity(actual: string, expected: string) {
  const [actualCanonical, expectedCanonical] = await Promise.all([
    realpath(actual),
    realpath(expected)
  ]);
  const receipt = { actual, expected, actualCanonical, expectedCanonical };

  if (actualCanonical !== expectedCanonical)
    throw new Error(`Packaged test profile was not isolated: ${JSON.stringify(receipt)}`);
  return receipt;
}
