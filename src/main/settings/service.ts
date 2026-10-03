import type { LoginStatus } from '../../shared/contracts/login-status';
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
import { SettingsEffects } from './effects';

type SettingsStorage = Pick<StorageClient, 'call'>;

/** Cache is a committed bootstrap snapshot; SQLite remains authoritative. */
export class SettingsService {
  private tail: Promise<unknown> = Promise.resolve();
  private closing = false;
  private effectsFailed = false;
  private snapshot: SettingsSnapshot | undefined;
  private readonly effects: SettingsEffects;

  isUnavailable(key: keyof Settings): boolean {
    return this.effects.isUnavailable(key);
  }

  get startupUnavailable(): readonly (keyof Settings)[] {
    return this.effects.startupUnavailable;
  }

  constructor(
    private readonly storage: SettingsStorage,
    private readonly controllers: SettingsControllers
  ) {
    this.effects = new SettingsEffects(controllers);
  }

  initialize(): Promise<SettingsSnapshot> {
    if (this.closing) return Promise.reject(new Error('Preferences are shutting down.'));
    const initialization = this.tail.then(() => this.loadInitial());

    this.tail = initialization.catch(() => undefined);
    return initialization;
  }

  private async loadInitial(): Promise<SettingsSnapshot> {
    const result = await this.storage.call('getSettings', {});

    if (!result.ok) throw new Error(result.error.message);
    await this.effects.apply(result.value, undefined);
    this.snapshot = result.value;
    return result.value;
  }

  get current(): SettingsSnapshot {
    if (this.snapshot === undefined) throw new Error('Settings are not initialized.');
    return structuredClone(this.snapshot);
  }

  readonly services: Pick<DesktopOperations, 'getSettings' | 'updateSettings' | 'getLoginStatus'> =
    {
      getSettings: () => this.enqueue(() => this.storage.call('getSettings', {})),
      getLoginStatus: () =>
        this.enqueue(() => Promise.resolve({ ok: true, value: this.loginStatus() })),
      updateSettings: (patch) => this.enqueue(() => this.update(patch))
    };

  async close(): Promise<void> {
    this.closing = true;
    await this.tail;
  }

  private enqueue<T>(action: () => Promise<DesktopResult<T>>): Promise<DesktopResult<T>> {
    if (this.closing)
      return Promise.resolve(failure('UNAVAILABLE', 'Preferences are shutting down.'));
    const result = this.tail.then(action);

    this.tail = result.catch(() => undefined);
    return result;
  }

  private loginStatus(): LoginStatus {
    const requested = this.current.settings.launchAtLogin;

    try {
      if (
        this.effectsFailed ||
        this.isUnavailable('launchAtLogin') ||
        this.controllers.loginStatus === undefined
      )
        throw new Error('Login status unavailable.');
      const { registered, enabled } = this.controllers.loginStatus();

      return { requested, registered, enabled, available: true };
    } catch {
      return { requested, registered: false, enabled: false, available: false };
    }
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
      await this.effects.apply(
        next,
        previous.value,
        applied,
        Object.keys(parsed.data) as (keyof Settings)[]
      );
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
      await this.effects.rollback(previous.value, applied);
    } catch {
      this.effectsFailed = true;
      return failure(
        'INTERNAL',
        'Preference rollback failed. Restart Promptly to restore the persisted preferences.'
      );
    }

    return failed;
  }
}
