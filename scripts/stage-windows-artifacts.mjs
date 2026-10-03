import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve('out/make/squirrel.windows/x64');
const provenance = JSON.parse(await readFile(path.join(source, 'BUILD-PROVENANCE.json'), 'utf8'));
const signed = process.argv.includes('--signed');

if (
  provenance.platform !== 'win32' ||
  provenance.arch !== 'x64' ||
  provenance.unsignedDevelopment !== !signed
)
  throw new Error('Expected Windows x64 maker provenance matching the staging mode.');
const info = { version: provenance.version };
const directory = path.resolve(
  `out/staged/Promptly-${info.version}-${signed ? 'signed' : 'unsigned-dev'}-win32-x64`
);

await mkdir(directory, { recursive: true });
const artifacts = [];

for (const expected of provenance.artifacts) {
  const { file } = expected;

  if (path.basename(file) !== file) throw new Error('Unexpected artifact path.');
  const bytes = await readFile(path.join(source, file));
  const sha256 = createHash('sha256').update(bytes).digest('hex');

  if (sha256 !== expected.sha256 || bytes.length !== expected.bytes)
    throw new Error('Installer differs from maker-time provenance. Make again before staging.');
  await writeFile(path.join(directory, file), bytes);
  artifacts.push(expected);
}

await copyFile('RELEASING.md', path.join(directory, 'README.md'));
await writeFile(
  path.join(directory, 'BUILD.json'),
  `${JSON.stringify({ ...provenance, artifacts }, null, 2)}\n`
);
await writeFile(
  path.join(directory, 'SHA256SUMS'),
  `${artifacts.map((artifact) => `${artifact.sha256}  ${artifact.file}`).join('\n')}\n`
);
console.log(`Staged ${signed ? 'signed release' : 'unsigned development'} artifacts: ${directory}`);
