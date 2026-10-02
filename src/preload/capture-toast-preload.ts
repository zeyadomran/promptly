import { contextBridge, ipcRenderer } from 'electron';

import type { CaptureToast, CaptureToastBridge } from '../shared/contracts/capture-toast';
import { captureToastChannel, captureToastSchema } from '../shared/contracts/capture-toast';

let current: CaptureToast | null = null;
const listeners = new Set<(toast: CaptureToast | null) => void>();

ipcRenderer.on(captureToastChannel, (_event, value: unknown) => {
  const parsed = captureToastSchema.safeParse(value);

  if (value !== null && !parsed.success) return;
  current = parsed.success ? parsed.data : null;
  for (const listener of listeners) listener(current);
});
const bridge: CaptureToastBridge = Object.freeze({
  subscribe: (listener: (toast: CaptureToast | null) => void) => {
    listeners.add(listener);
    listener(current);
    return () => {
      listeners.delete(listener);
    };
  }
});

contextBridge.exposeInMainWorld('promptlyConfirmation', bridge);
