// @vitest-environment node
import { expect, test } from 'vitest';

import { isHostedMacosProbe } from '../e2e/carbon-hosted';

const hosted = {
  CI: 'true',
  GITHUB_ACTIONS: 'true',
  RUNNER_ENVIRONMENT: 'github-hosted',
  RUNNER_OS: 'macOS'
};

test('explicit GitHub-hosted macOS identity permits the owned control', () => {
  expect(isHostedMacosProbe('darwin', hosted)).toBe(true);
});

test.each(Object.keys(hosted))('missing hosted marker %s rejects inherited/local CI', (key) => {
  expect(isHostedMacosProbe('darwin', { ...hosted, [key]: undefined })).toBe(false);
});

test.each([
  ['darwin', { ...hosted, RUNNER_ENVIRONMENT: 'self-hosted' }],
  ['darwin', { CI: 'true' }],
  ['win32', hosted],
  ['darwin', { ...hosted, RUNNER_OS: 'Windows' }]
])('unsupported platform or environment refuses the control', (platform, environment) => {
  expect(isHostedMacosProbe(platform, environment)).toBe(false);
});
