import type { CaptureToastBridge } from '../../shared/contracts/capture-toast';

declare global {
  interface Window {
    readonly promptlyConfirmation: CaptureToastBridge;
  }
}
