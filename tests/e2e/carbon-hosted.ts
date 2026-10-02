/** No input probe may launch under local or self-hosted CI environments. */
export function isHostedMacosProbe(platform: string, environment: NodeJS.ProcessEnv): boolean {
  return (
    platform === 'darwin' &&
    environment['CI'] === 'true' &&
    environment['GITHUB_ACTIONS'] === 'true' &&
    environment['RUNNER_ENVIRONMENT'] === 'github-hosted' &&
    environment['RUNNER_OS'] === 'macOS'
  );
}
