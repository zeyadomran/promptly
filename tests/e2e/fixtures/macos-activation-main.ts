import { createMacosSelection } from '../../../src/main/platform/macos/macos-selection';
import type { MacosIdentity } from '../../../src/shared/contracts/macos-selection';

let adapter: ReturnType<typeof createMacosSelection> | undefined;
let fixturePid = 0;
let recorded: MacosIdentity | undefined;

// Test-only module loaded into an actual packaged Electron main process. No renderer routes.
export async function initialize(ownedPid: number) {
  fixturePid = ownedPid;
  adapter = createMacosSelection({
    resourcesPath: process.resourcesPath,
    packaged: true,
    applicationPath: 'unused'
  });
  await adapter.ready();
}

export async function recordFixture() {
  const result = await adapter?.foregroundIdentityResult();

  if (result?.status !== 'ok' || result.identity.source?.pid !== fixturePid)
    throw new Error('Owned fixture must be foreground');
  recorded = result.identity;
  return { recorded: true };
}

export async function foreground() {
  const result = await adapter?.foregroundIdentityResult();

  return {
    fixture: result?.status === 'ok' && result.identity.source?.pid === fixturePid,
    promptly: result?.status === 'ok' && result.identity.source?.pid === process.pid
  };
}

export async function capture() {
  if (recorded === undefined || recorded.source?.pid !== fixturePid)
    throw new Error('Missing owned fixture identity');
  return adapter?.captureSelection(recorded);
}

export async function activate() {
  if (recorded === undefined) throw new Error('Missing owned fixture identity');
  return adapter?.activateSource(recorded);
}

export async function activateForged() {
  if (recorded === undefined) throw new Error('Missing owned fixture identity');
  return adapter?.activateSource({ ...recorded });
}

export async function dispose() {
  await adapter?.dispose();
}
