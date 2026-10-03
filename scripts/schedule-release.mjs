const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export async function scheduleRelease(configuration, request) {
  const { repository, sha, version, lockVersion, packageVersion } = configuration;

  if (!stableVersion.test(version)) throw new Error('Expected a stable release version.');
  if (version !== lockVersion || version !== packageVersion)
    throw new Error('Package and lockfile versions must match.');
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Expected the tested commit SHA.');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid GitHub repository.');
  const root = `/repos/${repository}`;
  const tag = `v${version}`;
  const released = await request(`${root}/releases/tags/${tag}`);

  if (released.ok) return 'skipped';
  requireStatus(released, 404);
  const latest = await request(`${root}/releases/latest`);

  if (latest.ok) {
    const { tag_name: latestTag } = await latest.json();
    const previous =
      typeof latestTag === 'string' && latestTag.startsWith('v') ? latestTag.slice(1) : '';

    if (!stableVersion.test(previous))
      throw new Error('Latest release must have a stable version tag.');
    const oldParts = previous.split('.').map(BigInt);
    const difference = version
      .split('.')
      .map(BigInt)
      .findIndex((part, index) => part !== oldParts[index]);

    if (difference === -1 || BigInt(version.split('.')[difference]) < oldParts[difference])
      return 'skipped';
  } else requireStatus(latest, 404);
  const existing = await request(`${root}/git/ref/tags/${tag}`);

  if (existing.ok) {
    const { object } = await existing.json();

    // A later merge at the same version must never move or release the earlier tag.
    if (object.type !== 'commit' || object.sha !== sha) return 'skipped';
  } else {
    requireStatus(existing, 404);
    const created = await request(`${root}/git/refs`, {
      method: 'POST',
      body: { ref: `refs/tags/${tag}`, sha }
    });

    requireStatus(created, 201);
  }

  // GITHUB_TOKEN-created tags do not trigger push workflows. Dispatch on the tag
  // explicitly, retaining the release environment's tag-only access policy.
  const dispatched = await request(`${root}/actions/workflows/release.yml/dispatches`, {
    method: 'POST',
    body: { ref: tag, inputs: { publish: true } }
  });

  requireStatus(dispatched, 204);
  return 'dispatched';
}

function requireStatus(response, expected) {
  if (response.status !== expected)
    throw new Error(`GitHub returned ${response.status}; expected ${expected}.`);
}
