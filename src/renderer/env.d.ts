import type { DesktopBridge } from '../shared/contracts/desktop-bridge';
import type { SettingsSnapshot } from '../shared/contracts/settings';

declare global {
  interface Window {
    readonly promptly: DesktopBridge;
    readonly promptlyStyleNonce?: string;
    readonly promptlyInitialSettings?: SettingsSnapshot;
  }
}
