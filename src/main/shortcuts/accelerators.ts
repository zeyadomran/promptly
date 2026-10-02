import type { Binding, ShortcutAction } from './bindings';

export interface AcceleratorApi {
  register: (accelerator: string, callback: () => void) => boolean;
  unregister: (accelerator: string) => void;
  isRegistered: (accelerator: string) => boolean;
  setSuspended: (suspended: boolean) => void;
}

/** Retain old OS registrations until every newly required registration succeeds. */
export class Accelerators {
  private active = new Map<string, Binding>();
  private readonly owned = new Map<string, Binding>();
  private quarantined = false;

  constructor(
    private readonly api: AcceleratorApi,
    private readonly dispatch: (action: ShortcutAction) => void
  ) {}

  get failed(): boolean {
    return this.quarantined;
  }

  registered(action: ShortcutAction): boolean {
    return (
      !this.quarantined &&
      [...this.active.values()].some(
        (binding) => binding.action === action && this.api.isRegistered(binding.accelerator)
      )
    );
  }

  replace(next: readonly Binding[], initial = false): void {
    if (this.quarantined) throw new Error('Shortcut recovery requires a restart.');
    const added: Binding[] = [];
    const retained = new Map<string, Binding>();

    try {
      for (const binding of next) {
        const existing = this.active.get(binding.key);

        if (existing !== undefined && this.api.isRegistered(existing.accelerator)) {
          retained.set(binding.key, binding);
          continue;
        }

        const registered = this.api.register(binding.accelerator, () => {
          const current = this.active.get(binding.key);

          if (!this.quarantined && current !== undefined) this.dispatch(current.action);
        });

        if (registered) {
          added.push(binding);
          this.owned.set(binding.accelerator, binding);
        }

        if (!registered || !this.api.isRegistered(binding.accelerator)) {
          if (initial) continue;
          throw new Error('The operating system did not register this shortcut.');
        }

        retained.set(binding.key, binding);
      }
    } catch (error) {
      const rollbackErrors = this.removeAll(added);

      if (rollbackErrors.length > 0) {
        this.quarantine();
        throw new AggregateError([error, ...rollbackErrors], 'Shortcut rollback failed.', {
          cause: error
        });
      }

      throw error;
    }

    const errors = this.removeAll(
      [...this.active.values()].filter((binding) => !retained.has(binding.key))
    );

    if (errors.length > 0) {
      this.quarantine();
      throw new AggregateError(errors, 'Unable to restore shortcut registrations.');
    }

    this.active = retained;
  }

  suspend(suspended: boolean): void {
    this.api.setSuspended(suspended);
  }

  close(): void {
    this.quarantined = true;
    const errors: unknown[] = [];

    try {
      this.api.setSuspended(false);
    } catch (error) {
      errors.push(error);
    }

    errors.push(...this.removeAll(this.owned.values()));
    this.active.clear();
    if (errors.length > 0) throw new AggregateError(errors, 'Shortcut cleanup failed.');
  }

  private remove(binding: Binding): void {
    this.api.unregister(binding.accelerator);
    if (this.api.isRegistered(binding.accelerator)) throw new Error('Shortcut unregister failed.');
    this.owned.delete(binding.accelerator);
  }

  private removeAll(bindings: Iterable<Binding>): unknown[] {
    const errors: unknown[] = [];

    for (const binding of [...bindings]) {
      try {
        this.remove(binding);
      } catch (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  quarantine(): void {
    this.quarantined = true;
    this.api.setSuspended(true);
  }
}
