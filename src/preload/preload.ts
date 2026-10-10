import { contextBridge, ipcRenderer, webUtils } from 'electron';

import { changeChannel } from '../shared/contracts/operations';
import { previousAppChangedChannel } from '../shared/contracts/previous-app';
import { resultSchema } from '../shared/contracts/result';
import { settingsSnapshotSchema } from '../shared/contracts/settings';
import { updateChannel } from '../shared/contracts/updates';
import {
  focusSearchChannel,
  shellCommandChannel,
  shellNavigationChannel
} from '../shared/contracts/window';
import { settingsFromArguments } from '../shared/settings-bootstrap';
import { liveSettingsArgument, settingsBootstrapChannel } from '../shared/settings-bootstrap';
import { styleNonceFromArguments } from '../shared/style-nonce';
import { createDesktopBridge } from './create-desktop-bridge';
import { onboardingStatus } from './onboarding-status';

// Register before the renderer loads so the initial native route cannot be missed.
let navigation: unknown;
const navigationListeners = new Set<(view: unknown) => void>();
let pendingCommand: unknown;
const commandListeners = new Set<(command: unknown) => void>();

ipcRenderer.on(shellCommandChannel, (_event, value: unknown) => {
  if (commandListeners.size === 0) pendingCommand = value;
  else for (const listener of commandListeners) listener(value);
});

ipcRenderer.on(shellNavigationChannel, (_event, value: unknown) => {
  navigation = value;
  for (const listener of navigationListeners) listener(value);
});
const platform = process.platform;
const { bridge, dispose } = createDesktopBridge(
  {
    resolveDroppedFiles: (files) => {
      if (files.length > 8) throw new Error('Too many files.');
      return files.map((file) => {
        const filename = webUtils.getPathForFile(file);

        if (filename === '') throw new Error('Not a local file.');
        return filename;
      });
    },
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
    listenNavigation(listener) {
      navigationListeners.add(listener);
      if (navigation !== undefined) listener(navigation);
      return () => {
        navigationListeners.delete(listener);
      };
    },
    listenCommands(listener) {
      commandListeners.add(listener);
      const command = pendingCommand;

      pendingCommand = undefined;
      if (command !== undefined) listener(command);
      return () => {
        commandListeners.delete(listener);
      };
    },
    listenPreviousApp(listener) {
      const onPreviousApp = () => {
        listener();
      };

      ipcRenderer.on(previousAppChangedChannel, onPreviousApp);
      return () => {
        ipcRenderer.removeListener(previousAppChangedChannel, onPreviousApp);
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
