import type { DesktopBridge } from '../shared/contracts/desktop-bridge';

declare global {
  interface Window {
    readonly promptly: DesktopBridge;
  }
}
