import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

/** Actual installed Vitest in an isolated subprocess; its intentional body failure stays failure. */
export async function runOwnedHookFixture(explicitBudget) {
  const directory = await mkdtemp(path.join(tmpdir(), 'promptly-owned-hook-'));
  const moduleUrl = (relative) =>
    pathToFileURL(fileURLToPath(new URL(relative, import.meta.url))).href;
  const source = `
import { it, afterAll } from ${JSON.stringify(moduleUrl('../../node_modules/vitest/dist/index.js'))};
import { ownStorageClients } from ${JSON.stringify(moduleUrl('./storage-worker-owner.mjs'))};
import { storageFixtureTeardownMs } from ${JSON.stringify(moduleUrl('./storage-worker-budgets.mjs'))};
import { setTimeout as delay } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
const receipt = new URL('./receipt.json', import.meta.url);
const state = { teardownStarted:false, terminationObserved:false, directoryRemoved:false };
const save = () => writeFileSync(receipt, JSON.stringify(state));
const client = { worker:{threadId:1}, close:async()=>{
  await delay(300);client.worker.threadId=-1;state.terminationObserved=true;save();
}};
const owner = ownStorageClients(()=>client,()=>{state.directoryRemoved=true;save();});
owner.createClient();
afterAll(()=>{state.teardownStarted=true;save();return owner.dispose();}${explicitBudget ? ',storageFixtureTeardownMs/100' : ''});
it('owned pending request outlives body deadline',async()=>{await delay(500);},20);
`;
  let exitCode = 0;
  let output;

  try {
    await writeFile(path.join(directory, 'owner.test.mjs'), source);
    await writeFile(
      path.join(directory, 'vitest.config.mjs'),
      'export default {test:{environment:"node",include:["owner.test.mjs"],maxWorkers:1,hookTimeout:100}};'
    );
    try {
      const result = await promisify(execFile)(
        process.execPath,
        [
          fileURLToPath(new URL('../../node_modules/vitest/vitest.mjs', import.meta.url)),
          'run',
          '--config',
          path.join(directory, 'vitest.config.mjs')
        ],
        { cwd: directory, timeout: 10_000, maxBuffer: 131_072, windowsHide: true }
      );

      output = result.stdout + result.stderr;
    } catch (error) {
      if (error.code !== 1) throw error;
      exitCode = error.code;
      output = error.stdout + error.stderr;
    }

    return {
      exitCode,
      bodyTimeoutRetained: /Test timed out in 20ms/.test(output),
      hookTimeoutReported: /Hook timed out in 100ms/.test(output),
      ...JSON.parse(await readFile(path.join(directory, 'receipt.json'), 'utf8'))
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
