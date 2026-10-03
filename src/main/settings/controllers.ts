import type { Settings } from '../../shared/contracts/settings';
import type { NativeLoginState } from './login-preferences';

/** Implementations must settle within their bounded native operation deadline.
 * rollback(previous), or apply(previous), restores partial changes after rejection.
 * initialize may observe a native preference without reapplying it at startup.
 * No controller represents requested configuration as OS registration success. */
export interface SettingsController {
  readonly keys: readonly (keyof Settings)[];
  readonly name: string;
  readonly optionalStartup?: boolean;
  readonly reapply?: boolean;
  initialize?: (settings: Settings) => Promise<void>;
  apply: (settings: Settings) => Promise<void>;
  rollback?: (settings: Settings) => Promise<void>;
  quarantine?: () => void;
}

export interface SettingsControllers {
  readonly available: readonly SettingsController[];
  readonly unavailable: readonly (keyof Settings)[];
  readonly loginStatus?: () => NativeLoginState;
}
