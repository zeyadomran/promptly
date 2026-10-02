import type { CaptureToast } from '../../shared/contracts/capture-toast';

export interface ToastRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface ToastWindow {
  alive: () => boolean;
  present: (toast: CaptureToast, bounds: ToastRectangle) => void;
  hide: () => void;
  destroy: () => void;
}
export interface ToastEffects {
  create: (signal: AbortSignal) => Promise<ToastWindow>;
  workArea: (source: ToastRectangle) => ToastRectangle;
  schedule: (callback: () => void, milliseconds: number) => () => void;
  failed: () => void;
}
export interface ToastPreferences {
  enabled: boolean;
  theme: CaptureToast['theme'];
}
