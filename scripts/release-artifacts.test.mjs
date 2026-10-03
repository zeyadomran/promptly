import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { installerArtifacts } from './installer-artifacts.mjs';

test('stages only matching maker artifacts and rejects unsigned mode and tampering', async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'promptly-release-test-'));
  const source = path.join(workspace, 'out/make/squirrel.windows/x64');
  const stageScript = path.resolve('scripts/stage-windows-artifacts.mjs');
  const stage = (...args) =>
    spawnSync(process.execPath, [stageScript, ...args], {
      cwd: workspace,
      encoding: 'utf8',
      windowsHide: true
    });

  try {
    await mkdir(source, { recursive: true });
    await writeFile(path.join(workspace, 'RELEASING.md'), 'Release guide');
    await writeFile(path.join(source, 'RELEASES'), 'release index');
    await writeFile(path.join(source, 'Promptly-0.2.0-full.nupkg'), 'package');
    await writeFile(path.join(source, 'Promptly-x64-Setup.exe'), 'signed installer fixture');
    await assert.rejects(installerArtifacts(source));
    const artifacts = await installerArtifacts(source, true);

    await writeFile(
      path.join(source, 'BUILD-PROVENANCE.json'),
      JSON.stringify({
        version: '0.2.0',
        platform: 'win32',
        arch: 'x64',
        unsignedDevelopment: false,
        artifacts
      })
    );
    assert.notEqual(stage().status, 0);
    assert.equal(stage('--signed').status, 0);
    const destination = path.join(workspace, 'out/staged/Promptly-0.2.0-signed-win32-x64');

    assert.equal(
      await readFile(path.join(destination, 'Promptly-x64-Setup.exe'), 'utf8'),
      'signed installer fixture'
    );
    const metadata = JSON.parse(await readFile(path.join(destination, 'BUILD.json'), 'utf8'));

    assert.equal(metadata.unsignedDevelopment, false);
    assert.equal(metadata.artifacts.length, 3);
    await writeFile(path.join(source, 'Promptly-x64-Setup.exe'), 'modified after make');
    assert.notEqual(stage('--signed').status, 0);
  } finally {
    // mkdtemp returns this test's fresh, absolute directory under the OS temp root.
    assert.equal(path.dirname(workspace), path.resolve(os.tmpdir()));
    assert.ok(path.basename(workspace).startsWith('promptly-release-test-'));
    await rm(workspace, { recursive: true, force: true });
  }
});
