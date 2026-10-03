import type { Settings } from '../../shared/contracts/settings';
import type { Accelerators } from './accelerators';
import { bindings } from './bindings';

export function recoverBindings(
  preferences: Settings | undefined,
  accelerators: Accelerators,
  platform: NodeJS.Platform,
  recover: () => void
): void {
  if (preferences !== undefined) accelerators.replace(bindings(preferences, platform), true);
  if (!accelerators.registered('open')) recover();
}
