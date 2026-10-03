import { releaseSchema } from '../../shared/contracts/update-release';

const repository = 'https://github.com/zeyadomran/promptly';

export function releaseFeed(version: string): string {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid release version.');
  return `${repository}/releases/download/v${version}`;
}

export function newerVersion(candidate: string, current: string): boolean {
  if (!/^\d+\.\d+\.\d+$/.test(current)) return false;
  const currentParts = current.split('.').map(BigInt);
  const candidateParts = candidate.split('.').map(BigInt);

  for (const [index, part] of candidateParts.entries()) {
    const previous = currentParts[index];

    if (previous === undefined) return false;
    if (part !== previous) return part > previous;
  }

  return false;
}

/** Metadata only: never invokes Squirrel or downloads an installer. */
export async function findGithubRelease(
  current: string,
  fetcher: typeof fetch = fetch
): Promise<string | undefined> {
  const response = await fetcher(
    'https://api.github.com/repos/zeyadomran/promptly/releases/latest',
    {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Promptly-update-check' },
      signal: AbortSignal.timeout(15_000)
    }
  );

  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error('Release check failed.');
  const release = releaseSchema.parse(await response.json());

  if (release.draft || release.prerelease) return undefined;
  const version = release.tag_name.slice(1);

  if (!newerVersion(version, current)) return undefined;
  const base = releaseFeed(version);
  const required = ['RELEASES', `Promptly-${version}-full.nupkg`, 'Promptly-x64-Setup.exe'];

  if (
    !required.every((name) =>
      release.assets.some(
        (asset) =>
          asset.name === name && asset.browser_download_url === `${base}/${name}` && asset.size > 0
      )
    )
  )
    throw new Error('Release artifacts are incomplete.');
  return version;
}
