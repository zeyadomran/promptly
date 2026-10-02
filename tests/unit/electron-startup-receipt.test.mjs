// @vitest-environment node
import { spawn } from 'node:child_process';
import { once } from 'node:events';

import { expect, it } from 'vitest';

import { observeElectronStartup } from '../electron-startup-receipt';

it('retains owned exit state and known startup markers without retaining raw output', async () => {
  const child = spawn(
    process.execPath,
    [
      '-e',
      'process.stderr.write("Unable to initialize Promptly: private fixture text");process.exit(7)'
    ],
    { windowsHide: true }
  );
  const observer = observeElectronStartup(child, performance.now());

  observer.stage('first-window');
  await once(child, 'exit');
  const receipt = observer.snapshot();

  observer.detach();
  expect(receipt).toMatchObject({ exitCode: 7, signals: ['initializationFailed'] });
  expect(receipt.stderrBytes).toBeGreaterThan(0);
  expect(receipt.stages[0].stage).toBe('first-window');
  expect(JSON.stringify(receipt)).not.toContain('private fixture text');
});
