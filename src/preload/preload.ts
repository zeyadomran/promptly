import { contextBridge } from 'electron';

import type { DesktopBridge } from '../shared/contracts/desktop-bridge';

const platform = process.platform;
const bridge: DesktopBridge = Object.freeze({
  platform: platform === 'darwin' || platform === 'win32' ? platform : 'unsupported'
});

contextBridge.exposeInMainWorld('promptly', bridge);
