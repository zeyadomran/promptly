import type { DesktopResult } from '../../shared/contracts/result';
import { failure } from '../../shared/contracts/result';
import type { CaptureEffects, CaptureIdentity } from './ports';

/** Never persisted/exported. Native helpers retain at most 32 opaque source capabilities. */
export class CaptureSources {
  private readonly identities = new Map<string, CaptureIdentity>();

  constructor(private readonly native: CaptureEffects['native']) {}

  remember(id: string, identity: CaptureIdentity): void {
    this.identities.delete(id);
    this.identities.set(id, identity);
    if (this.identities.size > 32) {
      const oldest = this.identities.keys().next().value;

      if (oldest !== undefined) this.identities.delete(oldest);
    }
  }

  available(id: string): boolean {
    return this.identities.has(id) && this.native !== undefined;
  }

  async activate(id: string): Promise<DesktopResult<Record<string, never>>> {
    const identity = this.identities.get(id);

    if (identity === undefined || this.native === undefined)
      return failure('UNAVAILABLE', 'No retained source capability is available.');
    const status = await this.native.activateSource(identity);

    if (status === 'ok') return { ok: true, value: {} };
    this.identities.delete(id);
    return failure('UNAVAILABLE', 'The retained source could not be activated. Capture it again.');
  }

  forget(id: string): void {
    this.identities.delete(id);
  }

  clear(): void {
    this.identities.clear();
  }
}
