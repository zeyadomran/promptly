import type { Settings } from '../../shared/contracts/settings';

/** Implementations must settle within their bounded native operation deadline.
 * apply(previous) must restore partial changes even when apply(next) throws.
 * No controller represents requested configuration as OS registration success. */
export interface SettingsController {
  readonly keys: readonly (keyof Settings)[];
  readonly name: string;
  apply: (settings: Settings) => Promise<void>;
  quarantine?: () => void;
}

export interface SettingsControllers {
  readonly available: readonly SettingsController[];
  readonly unavailable: readonly (keyof Settings)[];
}
