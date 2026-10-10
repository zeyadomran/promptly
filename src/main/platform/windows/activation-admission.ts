import type { NativePreparation } from '../native/request-admission';
import type { SourceCapabilities } from './source-capabilities';
import type { WindowsIdentity } from './windows-selection';

export class ActivationAdmissionError extends Error {
  constructor(readonly status: 'foregroundChanged' | 'activationDenied') {
    super(status);
  }
}

export function admitActivation(
  capabilities: SourceCapabilities,
  identity: WindowsIdentity,
  generation: number,
  allowForeground: ((pid: number) => boolean) | undefined
): NativePreparation {
  return (child) => {
    if (child.pid === undefined || child.generation !== generation || !capabilities.known(identity))
      throw new ActivationAdmissionError('foregroundChanged');
    try {
      if (allowForeground?.(child.pid) === false)
        throw new ActivationAdmissionError('activationDenied');
    } catch {
      throw new ActivationAdmissionError('activationDenied');
    }

    if (!capabilities.known(identity)) throw new ActivationAdmissionError('foregroundChanged');
  };
}
