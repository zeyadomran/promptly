import { expect, it } from 'vitest';

import { dispatchOperation } from '../ipc/dispatch-operation';
import { applicationServices } from './application-services';

it('reads the running app version and opens only its fixed repository through authorized desktop operations', async () => {
  let version = '0.2.3';
  let rejectBrowser = false;
  const opened: string[] = [];
  const services = applicationServices(
    () => version,
    (url) => {
      if (rejectBrowser) return Promise.reject(new Error('Private native error'));
      opened.push(url);
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
  rejectBrowser = true;
  expect(await dispatchOperation(services, true, 'openRepository', {})).toEqual({
    ok: false,
    error: { code: 'UNAVAILABLE', message: 'Unable to open the GitHub repository. Try again.' }
  });
});
