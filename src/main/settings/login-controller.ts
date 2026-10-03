import type { SettingsController } from './controllers';
import type { NativeLoginState, NativePreferences } from './login-preferences';

/** Startup observes Windows; only an explicit preference action changes registration. */
export function loginController(native: NativePreferences): SettingsController {
  let previous: NativeLoginState | undefined;

  return {
    name: 'launch at login',
    optionalStartup: true,
    reapply: true,
    keys: ['launchAtLogin'],
    initialize: () => {
      native.getLoginState();
      return Promise.resolve();
    },
    apply: (settings) => {
      previous = undefined;
      previous = native.getLoginState();
      native.setLogin(settings.launchAtLogin);
      const actual = native.getLoginState();

      if (actual.registered !== settings.launchAtLogin || actual.enabled !== settings.launchAtLogin)
        throw new Error('Windows did not accept the login preference.');
      return Promise.resolve();
    },
    rollback: () => {
      if (previous !== undefined) {
        native.setLogin(previous.registered, previous.approved);
        const actual = native.getLoginState();

        if (
          actual.registered !== previous.registered ||
          actual.approved !== previous.approved ||
          actual.enabled !== previous.enabled
        )
          throw new Error('Windows did not restore the previous login state.');
      }

      return Promise.resolve();
    }
  };
}
