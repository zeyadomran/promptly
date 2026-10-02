import type { SettingsController } from '../settings/controllers';
import type { Accelerators } from './accelerators';
import type { DoubleTap } from './double-tap';

export function updateRecording(
  owners: Set<number>,
  owner: number,
  active: boolean,
  closing: boolean,
  accelerators: Accelerators,
  controller: SettingsController,
  taps: DoubleTap,
  recover: () => void
): void {
  if (closing) {
    if (active) throw new Error('Shortcuts are shutting down.');
    owners.delete(owner);
    taps.reset();
    return;
  }

  if (active) owners.add(owner);
  else owners.delete(owner);
  try {
    accelerators.suspend(owners.size > 0);
  } catch (error) {
    owners.delete(owner);
    try {
      accelerators.suspend(owners.size > 0);
    } catch {
      controller.quarantine?.();
    }

    taps.reset();
    throw error;
  }

  taps.reset();
  if (active) recover();
}
