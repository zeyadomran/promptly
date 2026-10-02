import { contextBridge, ipcRenderer } from 'electron';

import { changeChannel } from '../shared/contracts/operations';
import { styleNonceFromArguments } from '../shared/style-nonce';
import { createDesktopBridge } from './create-desktop-bridge';

const platform = process.platform;
const { bridge, dispose } = createDesktopBridge(
  {
    invoke: (channel, request) => ipcRenderer.invoke(channel, request),
    listen(listener) {
      const onChange = (_event: unknown, value: unknown): void => {
        listener(value);
      };

      ipcRenderer.on(changeChannel, onChange);
      return () => {
        ipcRenderer.removeListener(changeChannel, onChange);
      };
    }
  },
  platform === 'darwin' || platform === 'win32' ? platform : 'unsupported'
);

contextBridge.exposeInMainWorld('promptly', bridge);
contextBridge.exposeInMainWorld('promptlyStyleNonce', styleNonceFromArguments(process.argv));
window.addEventListener('unload', dispose, { once: true });
