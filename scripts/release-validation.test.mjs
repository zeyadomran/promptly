import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

test('publishes stable tags on main only and keeps validation dispatches unpublished', async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'promptly-release-validation-'));
  const script = path.resolve('scripts/validate-release.mjs');
  const git = (...args) =>
    execFileSync('git', args, { cwd: workspace, encoding: 'utf8', windowsHide: true });
  const validate = (tag, publish, event = 'workflow_dispatch', refType = 'tag') =>
    spawnSync(process.execPath, [script], {
      cwd: workspace,
      encoding: 'utf8',
      windowsHide: true,
      env: {
        ...process.env,
        GITHUB_REF_NAME: tag,
        GITHUB_REF_TYPE: refType,
        GITHUB_EVENT_NAME: event,
        PROMPTLY_PUBLISH_RELEASE: publish
      }
    });

  try {
    git('init', '--quiet');
    git('config', 'user.name', 'Release test');
    git('config', 'user.email', 'release-test@example.invalid');
    await writeFile(path.join(workspace, 'package.json'), JSON.stringify({ version: '0.1.0' }));
    git('add', 'package.json');
    git('-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Initial version');
    git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    assert.equal(validate('v0.1.0', 'true').status, 0);
    assert.equal(validate('v0.1.0', 'false', 'push').status, 0);
    assert.match(validate('v0.1.0', 'false').stdout, /validation only/);
    assert.equal(validate('v0.1.0-validation.1', 'false').status, 0);
    assert.notEqual(validate('v0.1.0-validation.1', 'true').status, 0);
    assert.notEqual(validate('v0.2.0', 'true').status, 0);
    assert.notEqual(validate('v0.1.0', 'true', 'workflow_dispatch', 'branch').status, 0);

    git(
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--allow-empty',
      '--quiet',
      '-m',
      'Unmerged change'
    );
    assert.notEqual(validate('v0.1.0', 'true').status, 0);
    assert.equal(validate('v0.1.0-validation.2', 'false').status, 0);
  } finally {
    assert.equal(path.dirname(workspace), path.resolve(os.tmpdir()));
    assert.ok(path.basename(workspace).startsWith('promptly-release-validation-'));
    await rm(workspace, { recursive: true, force: true });
  }
});
