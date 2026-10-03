import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const destination = path.resolve('out/third-party-notices');
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const packages = Object.entries(lock.packages).filter(
  ([location, metadata]) => location.startsWith('node_modules/') && !metadata.dev
);
const fonts = ['@fontsource/space-grotesk', '@fontsource/geist-mono'];

for (const font of fonts) {
  const location = `node_modules/${font}`;

  packages.push([location, lock.packages[location]]);
}

await mkdir(destination, { recursive: true });
const notices = [
  'Promptly unsigned development build — third-party notices',
  'Runtime dependency graph and bundled fonts. License files below retain their original terms.',
  'Promptly first-party code and supplied brand assets: MIT; see PROMPTLY-LICENSE.txt.',
  'Third-party components retain their own terms; the first-party MIT grant does not replace them.',
  'Electron LICENSE and LICENSES.chromium.html are included at the installation root.',
  'Squirrel.Windows bundled notices: SQUIRREL-COPYING.txt (vendor commit eef37460ae).',
  'Installer dependency notice qualification is incomplete: see LICENSE-PROVENANCE.md.',
  ''
];

for (const [location, metadata] of packages.sort(([left], [right]) => left.localeCompare(right))) {
  let files;

  try {
    files = await readdir(location, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT' && metadata.optional) continue;
    throw error;
  }

  const info = JSON.parse(await readFile(path.join(location, 'package.json'), 'utf8'));
  const licenses = files.filter(
    (file) => file.isFile() && /^(?:licen[cs]e|copying|notice)(?:[.-]|$)/i.test(file.name)
  );

  const directory = `${info.name.replaceAll('/', '_')}@${info.version}`;

  await mkdir(path.join(destination, directory), { recursive: true });
  if (licenses.length === 0) {
    // A missing npm license file requires a checked-in upstream copy for this exact version.
    const override = `${info.name.replaceAll('/', '_')}-${info.version}-LICENSE.txt`;

    await copyFile(
      path.join('packaging/licenses', override),
      path.join(destination, directory, 'LICENSE')
    );
    licenses.push({ name: 'LICENSE' });
  }

  for (const file of licenses)
    if (file.name !== 'LICENSE' || files.some((entry) => entry.name === 'LICENSE'))
      await copyFile(path.join(location, file.name), path.join(destination, directory, file.name));
  notices.push(`${info.name}@${info.version} — ${info.license ?? 'See bundled license text'}`);
  notices.push(...licenses.map((file) => `  ${directory}/${file.name}`));
}

await copyFile('LICENSE', path.join(destination, 'PROMPTLY-LICENSE.txt'));
await copyFile('packaging/SQUIRREL-COPYING.txt', path.join(destination, 'SQUIRREL-COPYING.txt'));
await copyFile('packaging/README.md', path.join(destination, 'LICENSE-PROVENANCE.md'));
for (const license of await readdir('packaging/licenses'))
  await copyFile(path.join('packaging/licenses', license), path.join(destination, license));
await writeFile(path.join(destination, 'THIRD-PARTY-NOTICES.txt'), `${notices.join('\n')}\n`);
