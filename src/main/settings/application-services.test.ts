import { expect, it } from 'vitest';

import { dispatchOperation } from '../ipc/dispatch-operation';
import { applicationServices } from './application-services';

it('reads the running app version and opens only its fixed project links through authorized desktop operations', async () => {
  let version = '0.2.3';
  let rejectBrowser = false;
  const opened: string[] = [];
  let view = 'library';
  const services = applicationServices(
    () => version,
    (url) => {
      if (rejectBrowser) return Promise.reject(new Error('Private native error'));
      opened.push(url);
      return Promise.resolve();
    },
    () => {
      if (rejectBrowser) return Promise.reject(new Error('Private lifecycle error'));
      view = 'wiki';
      return Promise.resolve();
    }
  );

  expect(await dispatchOperation(services, true, 'getApplicationInfo', {})).toEqual({
    ok: true,
    value: { version: '0.2.3' }
  });
  version = '0.2.4';
  expect(await dispatchOperation(services, true, 'getApplicationInfo', {})).toEqual({
    ok: true,
    value: { version: '0.2.4' }
  });
  expect(await dispatchOperation(services, false, 'openRepository', {})).toMatchObject({
    ok: false,
    error: { code: 'UNAUTHORIZED' }
  });
  expect(
    await dispatchOperation(services, true, 'openRepository', { url: 'file:///private' })
  ).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
  expect(opened).toEqual([]);
  expect(await dispatchOperation(services, true, 'openRepository', {})).toEqual({
    ok: true,
    value: {}
  });
  expect(opened).toEqual(['https://github.com/zeyadomran/promptly']);
  expect(await dispatchOperation(services, false, 'openWiki', {})).toMatchObject({
    ok: false,
    error: { code: 'UNAUTHORIZED' }
  });
  expect(
    await dispatchOperation(services, true, 'openWiki', { url: 'file:///private' })
  ).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
  expect(opened).toEqual(['https://github.com/zeyadomran/promptly']);
  expect(await dispatchOperation(services, true, 'openWiki', {})).toEqual({
    ok: true,
    value: {}
  });
  expect(view).toBe('wiki');
  expect(opened).toEqual(['https://github.com/zeyadomran/promptly']);
  expect(await dispatchOperation(services, false, 'openPrivacyPolicy', {})).toMatchObject({
    ok: false,
    error: { code: 'UNAUTHORIZED' }
  });
  expect(
    await dispatchOperation(services, true, 'openPrivacyPolicy', { url: 'file:///private' })
  ).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
  expect(opened).toEqual(['https://github.com/zeyadomran/promptly']);
  expect(await dispatchOperation(services, true, 'openPrivacyPolicy', {})).toEqual({
    ok: true,
    value: {}
  });
  expect(opened).toEqual([
    'https://github.com/zeyadomran/promptly',
    'https://github.com/zeyadomran/promptly/blob/main/PRIVACY.md'
  ]);
  expect(
    await dispatchOperation(services, false, 'openWikiPageEditor', { page: 'Home' })
  ).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
  for (const input of [{ page: '../private' }, { page: 'Home', url: 'file:///private' }]) {
    expect(await dispatchOperation(services, true, 'openWikiPageEditor', input)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_REQUEST' }
    });
  }

  expect(
    await dispatchOperation(services, true, 'openWikiResource', {
      resource: 'https://evil.example'
    })
  ).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
  expect(
    await dispatchOperation(services, true, 'openWikiPageEditor', { page: 'Capturing-Text' })
  ).toEqual({ ok: true, value: {} });
  expect(
    await dispatchOperation(services, true, 'openWikiResource', { resource: 'security' })
  ).toEqual({ ok: true, value: {} });
  expect(opened.slice(-2)).toEqual([
    'https://github.com/zeyadomran/promptly/wiki/Capturing-Text/_edit',
    'https://github.com/zeyadomran/promptly/blob/main/SECURITY.md'
  ]);
  rejectBrowser = true;
  expect(await dispatchOperation(services, true, 'openWikiPageEditor', { page: 'Home' })).toEqual({
    ok: false,
    error: { code: 'UNAVAILABLE', message: 'Unable to open the wiki editor. Try again.' }
  });
  expect(
    await dispatchOperation(services, true, 'openWikiResource', { resource: 'releases' })
  ).toEqual({
    ok: false,
    error: { code: 'UNAVAILABLE', message: 'Unable to open the project documentation. Try again.' }
  });
  expect(await dispatchOperation(services, true, 'openRepository', {})).toEqual({
    ok: false,
    error: { code: 'UNAVAILABLE', message: 'Unable to open the GitHub repository. Try again.' }
  });
  expect(await dispatchOperation(services, true, 'openWiki', {})).toEqual({
    ok: false,
    error: { code: 'UNAVAILABLE', message: 'Unable to open the user wiki. Try again.' }
  });
  expect(await dispatchOperation(services, true, 'openPrivacyPolicy', {})).toEqual({
    ok: false,
    error: { code: 'UNAVAILABLE', message: 'Unable to open the privacy policy. Try again.' }
  });
});
