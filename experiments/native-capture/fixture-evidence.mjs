import { mkdir, writeFile } from 'node:fs/promises';
import { arch, release } from 'node:os';
import path from 'node:path';

export async function saveFixtureEvidence(status, fixtures, failure) {
  const directory = path.resolve('test-results/native-feasibility');
  const receipt = {
    kind: 'owned-native-fixture-lifecycle',
    status,
    os: process.platform,
    release: release(),
    architecture: arch(),
    nodeVersion: process.version,
    fixtures,
    failure:
      failure === undefined
        ? null
        : {
            readiness: failure.fixtureLifecycle ?? failure.receipt ?? null,
            cleanup: failure.cleanup ?? null
          }
  };

  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, 'fixture-lifecycle.json'),
    `${JSON.stringify(receipt, null, 2)}\n`
  );
}
