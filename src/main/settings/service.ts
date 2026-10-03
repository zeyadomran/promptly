import type { DesktopOperations } from '../../shared/contracts/operations';
import { type DesktopResult, failure } from '../../shared/contracts/result';
import {
  type Settings,
  type SettingsPatch,
  settingsPatchSchema,
  settingsSchema,
  type SettingsSnapshot
} from '../../shared/contracts/settings';
import { shortcutChangeConflict } from '../../shared/shortcuts/conflicts';
import type { StorageClient } from '../storage/client';
import type { SettingsController, SettingsControllers } from './controllers';

type SettingsStorage = Pick<StorageClient, 'call'>;

/** Cache is a committed bootstrap snapshot; SQLite remains authoritative. */
export class SettingsService {
  private tail: Promise<unknown> = Promise.resolve();
  private closing = false;
  private effectsFailed = false;
  private snapshot: SettingsSnapshot | undefined;
  private readonly disabledControllers = new Set<SettingsController>();

  isUnavailable(key: keyof Settings): boolean {
    return (
      this.controllers.unavailable.includes(key) ||
      [...this.disabledControllers].some((controller) => controller.keys.includes(key))
    );
  }

  get startupUnavailable(): readonly (keyof Settings)[] {
    return [...this.disabledControllers].flatMap((controller) => [...controller.keys]);
  }

  constructor(
    private readonly storage: SettingsStorage,
    private readonly controllers: SettingsControllers
  ) {}

  initialize(): Promise<SettingsSnapshot> {
    if (this.closing) return Promise.reject(new Error('Preferences are shutting down.'));
    const initialization = this.tail.then(() => this.loadInitial());

    this.tail = initialization.catch(() => undefined);
    return initialization;
  }

  private async loadInitial(): Promise<SettingsSnapshot> {
    const result = await this.storage.call('getSettings', {});

    if (!result.ok) throw new Error(result.error.message);
    await this.apply(result.value, undefined);
    this.snapshot = result.value;
    return result.value;
  }

  get current(): SettingsSnapshot {
    if (this.snapshot === undefined) throw new Error('Settings are not initialized.');
    return structuredClone(this.snapshot);
  }

  readonly services: Pick<DesktopOperations, 'getSettings' | 'updateSettings'> = {
    getSettings: () => this.enqueue(() => this.storage.call('getSettings', {})),
    updateSettings: (patch) => this.enqueue(() => this.update(patch))
  };

  async close(): Promise<void> {
    this.closing = true;
    await this.tail;
  }

  private enqueue(
    action: () => Promise<DesktopResult<SettingsSnapshot>>
  ): Promise<DesktopResult<SettingsSnapshot>> {
    if (this.closing)
      return Promise.resolve(failure('UNAVAILABLE', 'Preferences are shutting down.'));
    const result = this.tail.then(action);

    this.tail = result.catch(() => undefined);
    return result;
  }

  private async update(input: SettingsPatch): Promise<DesktopResult<SettingsSnapshot>> {
    if (this.effectsFailed)
      return failure(
        'UNAVAILABLE',
        'Restart Promptly to restore native preferences before changing them again.'
      );
    const parsed = settingsPatchSchema.safeParse(input);

    if (!parsed.success)
      return failure(
        'INVALID_REQUEST',
        (parsed.error.issues[0]?.message ?? 'Invalid preference values.').slice(0, 256)
      );
    const previous = await this.storage.call('getSettings', {});

    if (!previous.ok) return previous;
    const next = {
      ...previous.value,
      settings: settingsSchema.parse({ ...previous.value.settings, ...parsed.data })
    };
    const changed = (key: keyof SettingsPatch) =>
      JSON.stringify(next.settings[key]) !== JSON.stringify(previous.value.settings[key]);
    const conflict = shortcutChangeConflict(previous.value.settings, next.settings, 'win32');

    if (conflict !== undefined) return failure('CONFLICT', conflict);

    if (
      Object.keys(parsed.data).some(
        (key) => this.isUnavailable(key as keyof Settings) && changed(key as keyof Settings)
      )
    )
      return failure(
        'UNAVAILABLE',
        'This native preference is unavailable. Restart Promptly before changing it. Your preferences were not changed.'
      );
    const applied: SettingsController[] = [];
    let failed: DesktopResult<SettingsSnapshot>;

    try {
      await this.apply(next, previous.value, applied);
      const committed = await this.storage.call('updateSettings', parsed.data);

      if (committed.ok) {
        this.snapshot = committed.value;
        return committed;
      }

      failed = committed;
    } catch (error) {
      failed = failure(
        'CONFLICT',
        error instanceof Error
          ? error.message.slice(0, 256)
          : 'Unable to apply preference. Your previous preference remains active.'
      );
    }

    try {
      await this.rollback(previous.value, applied);
    } catch {
      this.effectsFailed = true;
      return failure(
        'INTERNAL',
        'Preference rollback failed. Restart Promptly to restore the persisted preferences.'
      );
    }

    return failed;
  }

  private async apply(
    next: SettingsSnapshot,
    previous: SettingsSnapshot | undefined,
    applied: SettingsController[] = []
  ): Promise<void> {
    for (const controller of this.controllers.available) {
      if (this.disabledControllers.has(controller)) continue;
      if (
        previous !== undefined &&
        !controller.keys.some(
          (key) => JSON.stringify(next.settings[key]) !== JSON.stringify(previous.settings[key])
        )
      )
        continue;
      applied.push(controller);
      try {
        await controller.apply(next.settings);
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

  private async rollback(previous: SettingsSnapshot, applied: SettingsController[]): Promise<void> {
    const outcomes = await Promise.allSettled(
      [...applied]
        .reverse()
        .map((controller) => Promise.resolve().then(() => controller.apply(previous.settings)))
    );

    if (outcomes.some((outcome) => outcome.status === 'rejected')) {
      for (const controller of applied) controller.quarantine?.();
      throw new Error('Rollback failed');
    }
  }
}
