import type { Settings, SettingsSnapshot } from '../../shared/contracts/settings';
import type { SettingsController, SettingsControllers } from './controllers';

/** Serial preference effects and optional startup failures share one rollback authority. */
export class SettingsEffects {
  private readonly disabledControllers = new Set<SettingsController>();

  constructor(private readonly controllers: SettingsControllers) {}

  isUnavailable(key: keyof Settings): boolean {
    return (
      this.controllers.unavailable.includes(key) ||
      [...this.disabledControllers].some((controller) => controller.keys.includes(key))
    );
  }

  get startupUnavailable(): readonly (keyof Settings)[] {
    return [...this.disabledControllers].flatMap((controller) => [...controller.keys]);
  }

  async apply(
    next: SettingsSnapshot,
    previous: SettingsSnapshot | undefined,
    applied: SettingsController[] = [],
    requested: readonly (keyof Settings)[] = []
  ): Promise<void> {
    for (const controller of this.controllers.available) {
      if (this.disabledControllers.has(controller)) continue;
      if (
        previous !== undefined &&
        !controller.keys.some(
          (key) =>
            (controller.reapply === true && requested.includes(key)) ||
            JSON.stringify(next.settings[key]) !== JSON.stringify(previous.settings[key])
        )
      )
        continue;
      applied.push(controller);
      try {
        await (previous === undefined && controller.initialize !== undefined
          ? controller.initialize(next.settings)
          : controller.apply(next.settings));
      } catch (error) {
        if (previous === undefined && controller.optionalStartup === true) {
          this.disabledControllers.add(controller);
          controller.quarantine?.();
          continue;
        }

        throw new Error(
          `Unable to apply ${controller.name}. ${error instanceof Error ? error.message : 'Native registration failed.'} Your previous preference remains active.`,
          { cause: error }
        );
      }
    }
  }

  async rollback(previous: SettingsSnapshot, applied: SettingsController[]): Promise<void> {
    const outcomes = await Promise.allSettled(
      [...applied]
        .reverse()
        .map((controller) =>
          Promise.resolve().then(() => (controller.rollback ?? controller.apply)(previous.settings))
        )
    );

    if (outcomes.some((outcome) => outcome.status === 'rejected')) {
      for (const controller of applied) controller.quarantine?.();
      throw new Error('Rollback failed');
    }
  }
}
