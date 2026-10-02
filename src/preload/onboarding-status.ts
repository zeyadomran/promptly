import { ipcRenderer } from 'electron';

import {
  onboardingChannel,
  onboardingStateSchema,
  type OnboardingStatusBridge
} from '../shared/contracts/onboarding';

/** Read-only, schema-limited projection; this channel conveys no content or native capability. */
export const onboardingStatus: OnboardingStatusBridge = Object.freeze<OnboardingStatusBridge>({
  subscribe(listener) {
    const receive = (_event: unknown, value: unknown) => {
      const parsed = onboardingStateSchema.safeParse(value);

      if (parsed.success) listener(parsed.data);
    };

    ipcRenderer.on(onboardingChannel, receive);
    return () => {
      ipcRenderer.removeListener(onboardingChannel, receive);
    };
  }
});
