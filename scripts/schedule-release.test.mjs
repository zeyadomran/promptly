import assert from 'node:assert/strict';
import { test } from 'node:test';

import { scheduleRelease } from './schedule-release.mjs';

test('tags the tested version and dispatches publishing without replacing existing releases', async () => {
  const sha = 'a'.repeat(40);
  const configuration = {
    repository: 'owner/app',
    sha,
    version: '0.1.0',
    lockVersion: '0.1.0',
    packageVersion: '0.1.0'
  };
  let tag;
  let release;
  let latest;
  let denied = false;
  let dispatchFailed = false;
  const dispatched = [];
  const request = (route, options = {}) => {
    if (denied) return Promise.resolve(new Response(null, { status: 403 }));
    if (route === '/repos/owner/app/releases/tags/v0.1.0')
      return Promise.resolve(
        new Response(release && JSON.stringify(release), { status: release ? 200 : 404 })
      );
    if (route === '/repos/owner/app/releases/latest')
      return Promise.resolve(
        new Response(latest && JSON.stringify({ tag_name: latest }), { status: latest ? 200 : 404 })
      );
    if (route === '/repos/owner/app/git/ref/tags/v0.1.0')
      return Promise.resolve(
        new Response(tag && JSON.stringify({ object: { type: 'commit', sha: tag.sha } }), {
          status: tag ? 200 : 404
        })
      );
    if (route === '/repos/owner/app/git/refs' && options.method === 'POST') {
      tag = options.body;
      return Promise.resolve(new Response(null, { status: 201 }));
    }

    if (
      route === '/repos/owner/app/actions/workflows/release.yml/dispatches' &&
      options.method === 'POST'
    ) {
      if (dispatchFailed) return Promise.resolve(new Response(null, { status: 503 }));
      dispatched.push(options.body);
      return Promise.resolve(new Response(null, { status: 204 }));
    }

    throw new Error(`Unexpected GitHub request: ${route}`);
  };

  assert.equal(await scheduleRelease(configuration, request), 'dispatched');
  assert.deepEqual(tag, { ref: 'refs/tags/v0.1.0', sha });
  assert.deepEqual(dispatched, [{ ref: 'v0.1.0', inputs: { publish: true } }]);

  release = { draft: false };
  assert.equal(await scheduleRelease(configuration, request), 'skipped');
  release = { draft: true };
  assert.equal(await scheduleRelease(configuration, request), 'skipped');
  release = undefined;
  assert.equal(
    await scheduleRelease({ ...configuration, sha: 'b'.repeat(40) }, request),
    'skipped'
  );
  assert.equal(dispatched.length, 1);

  dispatchFailed = true;
  await assert.rejects(scheduleRelease(configuration, request), /503/);
  dispatchFailed = false;
  assert.equal(await scheduleRelease(configuration, request), 'dispatched');
  assert.equal(tag.sha, sha);

  latest = 'v0.2.0';
  assert.equal(await scheduleRelease(configuration, request), 'skipped');
  latest = undefined;

  denied = true;
  await assert.rejects(scheduleRelease(configuration, request), /403/);
  denied = false;
  await assert.rejects(
    scheduleRelease({ ...configuration, lockVersion: '0.2.0' }, request),
    /versions/
  );
  await assert.rejects(
    scheduleRelease({ ...configuration, version: '01.1.0' }, request),
    /version/
  );
});
