import { expect, it, vi } from 'vitest';

import { createDesktopBridge } from './create-desktop-bridge';

it('isolates and disposes the narrow search-focus subscription', () => {
  const stopFocus = vi.fn();
  let receive: (() => void) | undefined;
  const { bridge, dispose } = createDesktopBridge(
    {
      invoke: () => Promise.resolve(undefined),
      listen: () => () => undefined,
      listenFocus: (listener) => {
        receive = listener;
        return stopFocus;
      }
    },
    'win32'
  );
  const callback = vi.fn();
  const stop = bridge.subscribeWindowFocus(callback);

  receive?.();
  expect(callback).toHaveBeenCalledOnce();
  stop();
  expect(stopFocus).toHaveBeenCalledOnce();
  bridge.subscribeWindowFocus(callback);
  dispose();
  expect(stopFocus).toHaveBeenCalledTimes(2);
  bridge.subscribeWindowFocus(callback);
  expect(stopFocus).toHaveBeenCalledTimes(2);
});
