import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

import { scheduleRelease } from './schedule-release.mjs';

if (process.env.GITHUB_EVENT_NAME !== 'push' || process.env.GITHUB_REF !== 'refs/heads/main')
  throw new Error('Automatic releases require successful main push CI.');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

if (sha !== process.env.GITHUB_SHA) throw new Error('Checkout differs from the tested commit.');
if (!process.env.GH_TOKEN) throw new Error('GitHub authentication is required.');
const info = JSON.parse(await readFile('package.json', 'utf8'));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const result = await scheduleRelease(
  {
    repository: process.env.GITHUB_REPOSITORY,
    sha,
    version: info.version,
    lockVersion: lock.version,
    packageVersion: lock.packages[''].version
  },
  (route, options = {}) =>
    fetch(`https://api.github.com${route}`, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(30_000)
    })
);

console.log(`Release v${info.version}: ${result}.`);
