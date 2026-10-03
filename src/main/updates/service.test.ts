import { expect, it } from 'vitest';

import { findGithubRelease } from './github-release';
import { UpdateService } from './service';

it('checks without applying an update until the user chooses it', async () => {
  const applied: string[] = [];
  let openNotification: (() => void) | undefined;
  let openedSettings = false;
  let restarted = false;
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
  expect((await service.check()).status).toBe('error');
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
  expect(service.state.status).toBe('available');
  expect(service.state.message).toContain('Unable to update');
  failApply = false;
  await service.install();
  expect(applied).toEqual(['0.10.0']);
  expect(service.state.status).toBe('ready');
  expect(restarted).toBe(false);
  service.restart();
  expect(restarted).toBe(true);
  service.close();
});

it('serializes consent and ignores late completions after shutdown', async () => {
  let resolveCheck: (version: string) => void = () => undefined;
  let resolveApply: () => void = () => undefined;
  const notifications: string[] = [];
  const applied: string[] = [];
  const service = new UpdateService({
    available: true,
    findRelease: () =>
      new Promise((resolve) => {
        resolveCheck = resolve;
      }),
    apply: (version) => {
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
  service.close();
  const retired = service.state;

  resolveApply();
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
