import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { installerArtifacts } from './installer-artifacts.mjs';

const directory = path.resolve('out/make/squirrel.windows/x64');
const provenance = JSON.parse(await readFile('out/build-provenance.json', 'utf8'));
const artifacts = await installerArtifacts(directory);

await writeFile(
  path.join(directory, 'BUILD-PROVENANCE.json'),
  `${JSON.stringify({ ...provenance, artifacts }, null, 2)}\n`
);
