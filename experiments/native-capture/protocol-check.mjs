import assert from 'node:assert/strict';
import { arch, release } from 'node:os';
import path from 'node:path';

import { checkWindowsFixtures } from './fixture-check.mjs';
import { openHelper } from './protocol-client.mjs';

const executable = path.join(
  import.meta.dirname,
  'out',
  process.platform === 'win32' ? 'promptly-native.exe' : 'promptly-native'
);
const helper = openHelper(executable);

try {
  const capabilities = await helper.request('capabilities');

  assert.equal(capabilities.status, 'ok');
  assert.equal(capabilities.platform, process.platform);
  assert.equal(capabilities.clipboardFallback, false);

  const before = await helper.request('clipboardMetadata');
  const fallback = await helper.request('fallback');
  const after = await helper.request('clipboardMetadata');

  assert.equal(fallback.status, 'unsupported');
  assert.equal(fallback.clipboardMutated, false);
  assert.equal(fallback.keysInjected, false);
  // This comparison observes concurrent copies, without restoring over someone else's copy.
  const unchanged =
    before.status === 'ok' && after.status === 'ok' && before.counterBefore === after.counterAfter;

  assert.equal((await helper.request('unknown')).status, 'invalidRequest');
  const mismatch = await helper.request('capture', { expectedPid: 2147483647, includeText: true });

  assert.equal(mismatch.status, 'foregroundChanged');
  assert.equal(mismatch.text, undefined);

  const shortcut = await helper.request('probeAltSpace');
  const hook = await helper.request('hookStart');
  const fixtures =
    process.argv.includes('--fixtures') && process.platform === 'win32'
      ? await checkWindowsFixtures(executable, helper)
      : [];

  console.log(
    JSON.stringify({
      kind: 'native-feasibility',
      os: process.platform,
      release: release(),
      architecture: arch(),
      clipboardCounterUnchanged: unchanged,
      clipboardMetadataStatus: before.status,
      hookInstallationStatus: hook.status,
      altSpaceRegistrationStatus: shortcut.status,
      fixtures,
      humanCoverage: false,
      endToEndToastLatencyMeasured: false
    })
  );
  await helper.close();
} catch (error) {
  helper.kill();
  throw error;
}
