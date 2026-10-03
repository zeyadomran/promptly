import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);
const revision = await run('git', ['rev-parse', 'HEAD'], { windowsHide: true });
const state = await run('git', ['status', '--porcelain'], { windowsHide: true });
const info = JSON.parse(await readFile('package.json', 'utf8'));
const signed = process.env['PROMPTLY_SIGN_RELEASE'] === 'true';

if (signed && state.stdout.length > 0) throw new Error('Signed releases require a clean checkout.');

await mkdir('out', { recursive: true });
await writeFile(
  'out/build-provenance.json',
  `${JSON.stringify({ version: info.version, commit: revision.stdout.trim(), dirty: state.stdout.length > 0, builtAt: new Date().toISOString(), electron: info.devDependencies.electron, platform: 'win32', arch: 'x64', unsignedDevelopment: !signed }, null, 2)}\n`
);
