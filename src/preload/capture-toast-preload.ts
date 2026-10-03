import { contextBridge, ipcRenderer } from 'electron';

import type { CaptureToast, CaptureToastBridge } from '../shared/contracts/capture-toast';
import {
  captureToastActivationChannel,
  captureToastActivationSchema,
  captureToastChannel,
  captureToastSchema
} from '../shared/contracts/capture-toast';

let current: CaptureToast | null = null;
const listeners = new Set<(toast: CaptureToast | null) => void>();

ipcRenderer.on(captureToastChannel, (_event, value: unknown) => {
  const parsed = captureToastSchema.safeParse(value);

  if (value !== null && !parsed.success) return;
  current = parsed.success ? parsed.data : null;
  for (const listener of listeners) listener(current);
});
const bridge: CaptureToastBridge = Object.freeze({
  activate: (version: number) => {
    if (
      current?.phase !== 'visible' ||
      current.version !== version ||
      !captureToastActivationSchema.safeParse(version).success
    )
      return;
    ipcRenderer.send(captureToastActivationChannel, version);
  },
  subscribe: (listener: (toast: CaptureToast | null) => void) => {
    listeners.add(listener);
    listener(current);
    return () => {
      listeners.delete(listener);
    };
  }
});

contextBridge.exposeInMainWorld('promptlyConfirmation', bridge);
