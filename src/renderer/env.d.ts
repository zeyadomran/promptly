import type { DesktopBridge } from '../shared/contracts/desktop-bridge';
import type { OnboardingStatusBridge } from '../shared/contracts/onboarding';
import type { SettingsSnapshot } from '../shared/contracts/settings';

declare global {
  interface Window {
    readonly promptly: DesktopBridge;
    readonly promptlyOnboarding: OnboardingStatusBridge;
    readonly promptlyStyleNonce?: string;
    readonly promptlyInitialSettings?: SettingsSnapshot;
  }
}
