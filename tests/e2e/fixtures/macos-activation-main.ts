import { createMacosSelection } from '../../../src/main/platform/macos/macos-selection';
import type { MacosIdentity } from '../../../src/shared/contracts/macos-selection';

let adapter: ReturnType<typeof createMacosSelection> | undefined;
let fixturePid = 0;
let recorded: MacosIdentity | undefined;
const identityReadiness: object[] = [];
let initializedAt = 0;

// Test-only module loaded into an actual packaged Electron main process. No renderer routes.
export async function initialize(ownedPid: number) {
  initializedAt = performance.now();
  fixturePid = ownedPid;
  adapter = createMacosSelection({
    resourcesPath: process.resourcesPath,
    packaged: true,
    applicationPath: 'unused'
  });
  await adapter.ready();
}

export async function recordFixture() {
  const started = performance.now();
  const result = await adapter?.foregroundIdentityResult();
  const owned = result?.status === 'ok' && result.identity.source?.pid === fixturePid;
  const observation = {
    status: result?.status ?? 'helperUnavailable',
    owned,
    sourceAvailable: result?.status === 'ok' && result.identity.source !== null,
    promptly: result?.status === 'ok' && result.identity.source?.pid === process.pid,
    requestMs: performance.now() - started,
    elapsedMs: performance.now() - initializedAt
  };

  if (identityReadiness.length < 128) identityReadiness.push(observation);
  if (owned) recorded = result.identity;
  return observation;
}

export function readinessSnapshot() {
  return [...identityReadiness];
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
