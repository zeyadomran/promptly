import { expect, it } from 'vitest';

import type { UpdateProgress } from '../../shared/contracts/updates';
import { findGithubRelease } from './github-release';
import { UpdateService } from './service';

it('checks without applying an update until the user chooses it', async () => {
  const applied: string[] = [];
  let openNotification: (() => void) | undefined;
  let openedSettings = false;
  let restarted = false;
  let failRestart = true;
  let failApply = true;
  let releaseVersion = '0.1.0';
  let status = 200;
  let incomplete = false;
  const fetcher: typeof fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          tag_name: `v${releaseVersion}`,
          draft: false,
          prerelease: false,
          assets: (incomplete
            ? []
            : ['RELEASES', `Promptly-${releaseVersion}-full.nupkg`, 'Promptly-x64-Setup.exe']
          ).map((name) => ({
            name,
            size: 123,
            browser_download_url: `https://github.com/zeyadomran/promptly/releases/download/v${releaseVersion}/${name}`
          }))
        }),
        { status }
      )
    );
  const service = new UpdateService({
    available: true,
    findRelease: () => findGithubRelease('0.1.0', fetcher),
    apply: (version) => {
      if (failApply) return Promise.reject(new Error('Network unavailable'));
      applied.push(version);
      return Promise.resolve();
    },
    restart: () => {
      if (failRestart) throw new Error('Restart unavailable');
      restarted = true;
    },
    notify: (_version, open) => {
      openNotification = open;
    },
    openSettings: () => {
      openedSettings = true;
      return Promise.resolve();
    },
    publish: () => undefined
  });

  expect(await service.check()).toMatchObject({ status: 'current', message: 'No updates found.' });
  releaseVersion = '0.0.9';
  expect((await service.check()).status).toBe('current');
  status = 404;
  expect((await service.check()).status).toBe('current');
  status = 403;
  expect(await service.check()).toMatchObject({ status: 'error', retryOperation: 'check' });
  status = 200;
  releaseVersion = '0.10.0';
  incomplete = true;
  expect((await service.check()).status).toBe('error');
  incomplete = false;
  expect(await service.check(true)).toMatchObject({ status: 'available', version: '0.10.0' });
  expect(applied).toEqual([]);
  openNotification?.();
  expect(openedSettings).toBe(true);
  expect(service.state.focusRequest).toBe(1);
  expect(applied).toEqual([]);
  service.restart();
  expect(restarted).toBe(false);
  await service.install();
  expect(service.state).toMatchObject({ status: 'error', retryOperation: 'install' });
  expect(service.state.message).toContain('Unable to update');
  expect(await service.check(true)).toMatchObject({
    status: 'error',
    retryOperation: 'install',
    version: '0.10.0'
  });
  failApply = false;
  await service.install();
  expect(applied).toEqual(['0.10.0']);
  expect(service.state.status).toBe('ready');
  expect(restarted).toBe(false);
  service.restart();
  expect(service.state).toMatchObject({ status: 'error', retryOperation: 'restart' });
  expect(await service.check(true)).toMatchObject({
    status: 'error',
    retryOperation: 'restart',
    version: '0.10.0'
  });
  expect(restarted).toBe(false);
  failRestart = false;
  service.restart();
  expect(restarted).toBe(true);
  service.close();
});

it('serializes consent and ignores late completions after shutdown', async () => {
  let resolveCheck: (version: string) => void = () => undefined;
  let resolveApply: () => void = () => undefined;
  let reportProgress: (progress: UpdateProgress) => void = () => undefined;
  const notifications: string[] = [];
  const applied: string[] = [];
  const service = new UpdateService({
    available: true,
    findRelease: () =>
      new Promise((resolve) => {
        resolveCheck = resolve;
      }),
    apply: (version, progress) => {
      reportProgress = progress;
      applied.push(version);
      return new Promise((resolve) => {
        resolveApply = resolve;
      });
    },
    restart: () => undefined,
    notify: (version) => {
      notifications.push(version);
    },
    openSettings: () => Promise.resolve(),
    publish: () => undefined
  });
  const checking = service.check(true);

  expect((await service.check()).status).toBe('checking');
  await service.install();
  expect(applied).toEqual([]);
  resolveCheck('0.2.0');
  await checking;
  const installing = service.install();

  await service.install();
  expect(applied).toEqual(['0.2.0']);
  expect((await service.check()).status).toBe('updating');
  expect(service.state.progress).toBeUndefined();
  reportProgress({ percent: 120 });
  reportProgress({ transferred: 50, total: 10 });
  expect(service.state.progress).toBeUndefined();
  reportProgress({ percent: 42, transferred: 18_400_000, total: 43_800_000 });
  expect(service.state.progress).toEqual({
    percent: 42,
    transferred: 18_400_000,
    total: 43_800_000
  });
  const snapshot = service.state;

  if (snapshot.progress !== undefined) snapshot.progress.percent = 99;
  expect(service.state.progress?.percent).toBe(42);
  service.close();
  const retired = service.state;

  resolveApply();
  reportProgress({ percent: 100 });
  await installing;
  expect(service.state).toEqual(retired);
  expect(notifications).toEqual(['0.2.0']);
  const closedCheck = new UpdateService({
    available: true,
    findRelease: () =>
      new Promise((resolve) => {
        resolveCheck = resolve;
      }),
    apply: () => Promise.resolve(),
    restart: () => undefined,
    notify: (version) => {
      notifications.push(version);
    },
    openSettings: () => Promise.resolve(),
    publish: () => undefined
  });
  const pending = closedCheck.check(true);

  closedCheck.close();
  resolveCheck('0.3.0');
  await pending;
  expect(notifications).toEqual(['0.2.0']);
});
