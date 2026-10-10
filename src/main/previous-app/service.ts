import type { PreviousApp, ReturnOutcome } from '../../shared/contracts/previous-app';
import type { WindowsIdentity, WindowsSelection } from '../platform/windows/windows-selection';

export interface PreviousAppEffects {
  native: Pick<
    WindowsSelection,
    'foregroundIdentityResult' | 'sourceAvailable' | 'activateSource'
  > &
    Partial<Pick<WindowsSelection, 'activationTargetIdentity'>>;
  ownPid: number;
  alwaysOnTop: () => boolean;
  hide: () => void;
}

export class PreviousAppService {
  private target: WindowsIdentity | undefined;
  private epoch = 0;
  private closing = false;
  private pendingCapture: Promise<void> | undefined;
  private readonly isClosing = () => this.closing;

  constructor(private readonly effects: PreviousAppEffects) {}

  captureAfterFocus(): Promise<void> {
    if (this.effects.native.activationTargetIdentity === undefined) return Promise.resolve();
    return this.startCapture(true);
  }

  captureBeforeShow(): Promise<void> {
    return this.startCapture(false);
  }

  private startCapture(afterFocus: boolean): Promise<void> {
    const prior = this.target;

    this.target = undefined;
    const pending = this.capture(afterFocus, prior);

    this.pendingCapture = pending;
    void pending.finally(() => {
      if (this.pendingCapture === pending) this.pendingCapture = undefined;
    });
    return pending;
  }

  private async capture(afterFocus: boolean, prior: WindowsIdentity | undefined): Promise<void> {
    const epoch = ++this.epoch;

    if (this.isClosing()) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      const result = await Promise.race([
        afterFocus
          ? this.effects.native.activationTargetIdentity?.(this.effects.ownPid)
          : this.effects.native.foregroundIdentityResult(this.effects.ownPid),
        new Promise<undefined>((resolve) => {
          timeout = setTimeout(() => {
            resolve(undefined);
          }, 100);
        })
      ]);

      if (this.isClosing() || epoch !== this.epoch) return;
      if (result?.status !== 'ok') {
        if (!afterFocus && result?.ownForeground === true) this.target = prior;
        return;
      }

      const source = result.identity.source;

      // Missing process attribution cannot establish an eligible external target.
      if (source?.pid === this.effects.ownPid) {
        if (!afterFocus) this.target = prior;
        return;
      }

      if (
        source === null ||
        /^promptly(?:\.exe)?$/i.test(source.id) ||
        /^promptly$/i.test(source.name)
      )
        return;
      this.target = result.identity;
    } catch {
      // Foreground inspection is advisory and must never prevent normal window opening.
    } finally {
      clearTimeout(timeout);
      if (this.epoch === epoch) this.epoch++;
    }
  }

  async getPreviousApp(): Promise<PreviousApp> {
    await this.pendingCapture;
    const target = this.target;

    if (this.isClosing() || target === undefined || !(await this.available(target)))
      return { state: 'none' };
    return { state: 'available', label: this.label(target) };
  }

  async returnToPreviousApp(): Promise<ReturnOutcome> {
    await this.pendingCapture;
    const target = this.target;

    if (target === undefined) return { returned: 'unavailable' };
    const label = this.label(target);

    if (this.isClosing() || !(await this.available(target)))
      return { returned: 'unavailable', label };
    try {
      const result = await this.effects.native.activateSource(target);

      if (result !== 'ok')
        return {
          returned:
            result === 'foregroundChanged' || result === 'helperUnavailable'
              ? 'unavailable'
              : 'denied',
          label
        };
      try {
        if (!this.isClosing() && this.target === target && !this.effects.alwaysOnTop())
          this.effects.hide();
      } catch {
        // Activation was confirmed; a later visibility effect cannot turn it into denial.
      }

      return { returned: 'returned', label };
    } catch {
      return { returned: 'denied', label };
    }
  }

  private async available(target: WindowsIdentity): Promise<boolean> {
    try {
      const available = await this.effects.native.sourceAvailable(target);

      if (this.target !== target || this.isClosing()) return false;
      return available;
    } catch {
      return false;
    }
  }

  private label(target: WindowsIdentity): string {
    let label = '';

    for (const character of target.source?.name ?? 'Previous app') {
      if (label.length + character.length > 64) break;
      label += character;
    }

    return label;
  }

  close(): void {
    this.closing = true;
    this.epoch++;
    this.target = undefined;
  }
}
