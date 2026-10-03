import { contextBridge, ipcRenderer } from 'electron';

import { changeChannel } from '../shared/contracts/operations';
import { resultSchema } from '../shared/contracts/result';
import { settingsSnapshotSchema } from '../shared/contracts/settings';
import { updateChannel } from '../shared/contracts/updates';
import { focusSearchChannel } from '../shared/contracts/window';
import { settingsFromArguments } from '../shared/settings-bootstrap';
import { liveSettingsArgument, settingsBootstrapChannel } from '../shared/settings-bootstrap';
import { styleNonceFromArguments } from '../shared/style-nonce';
import { createDesktopBridge } from './create-desktop-bridge';
import { onboardingStatus } from './onboarding-status';

const platform = process.platform;
const { bridge, dispose } = createDesktopBridge(
  {
    invoke: (channel, request) => ipcRenderer.invoke(channel, request),
    listenUpdates(listener) {
      const onUpdate = (_event: unknown, value: unknown) => {
        listener(value);
      };

      ipcRenderer.on(updateChannel, onUpdate);
      return () => {
        ipcRenderer.removeListener(updateChannel, onUpdate);
      };
    },
    listenFocus(listener) {
      const onFocus = () => {
        listener();
      };

      ipcRenderer.on(focusSearchChannel, onFocus);
      return () => {
        ipcRenderer.removeListener(focusSearchChannel, onFocus);
      };
    },
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
  platform === 'win32' ? platform : 'unsupported'
);

contextBridge.exposeInMainWorld('promptly', bridge);
contextBridge.exposeInMainWorld('promptlyOnboarding', onboardingStatus);
contextBridge.exposeInMainWorld('promptlyStyleNonce', styleNonceFromArguments(process.argv));
const initial = process.argv.includes(liveSettingsArgument)
  ? resultSchema(settingsSnapshotSchema).parse(ipcRenderer.sendSync(settingsBootstrapChannel, {}))
  : undefined;

contextBridge.exposeInMainWorld(
  'promptlyInitialSettings',
  initial?.ok === true ? initial.value : settingsFromArguments(process.argv)
);
window.addEventListener('unload', dispose, { once: true });
