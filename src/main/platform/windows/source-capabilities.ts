import { nativeActivationSchema } from '../../../shared/contracts/native-selection';
import type { NativeProcess } from '../native/native-process';
import type { WindowsIdentity } from './windows-selection';

/** Issued objects are tied to one live helper; validation never starts a replacement. */
export class SourceCapabilities {
  private readonly issued = new WeakMap<WindowsIdentity, number>();

  constructor(private readonly transport: NativeProcess) {}

  remember(identity: WindowsIdentity): void {
    this.issued.set(identity, this.transport.generation);
  }

  known(identity: WindowsIdentity): boolean {
    return this.transport.running && this.issued.get(identity) === this.transport.generation;
  }

  async available(identity: WindowsIdentity): Promise<boolean> {
    if (!this.known(identity)) return false;
    try {
      const result = await this.transport.request(
        'validate',
        { identity: identity.token },
        (value) => nativeActivationSchema.parse(value),
        100
      );

      if (result.status === 'ok' && this.known(identity)) return true;
    } catch {
      // Transport failure cannot enable activation; a busy request does not retire authority.
      return false;
    }

    this.issued.delete(identity);
    return false;
  }
}
