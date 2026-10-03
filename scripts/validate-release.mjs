import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const publishing =
  process.env['GITHUB_EVENT_NAME'] === 'push' ||
  (process.env['GITHUB_EVENT_NAME'] === 'workflow_dispatch' &&
    process.env['PROMPTLY_PUBLISH_RELEASE'] === 'true');
const tag = process.env['GITHUB_REF_NAME'];
const validationTag =
  tag === `v${version}-validation` ||
  new RegExp(`^v${version.replaceAll('.', '\\.')}\\-validation\\.\\d+$`).test(tag ?? '');

if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Release version must be stable semver.');
if (
  process.env['GITHUB_REF_TYPE'] !== 'tag' ||
  (tag !== `v${version}` && (publishing || !validationTag))
)
  throw new Error(
    'Use the matching v<package version> tag, or v<version>-validation for a manual signing check.'
  );
if (publishing)
  execFileSync('git', ['merge-base', '--is-ancestor', 'HEAD', 'origin/main'], { stdio: 'inherit' });
console.log(`Validated ${tag}: ${publishing ? 'publish release' : 'signing validation only'}.`);
