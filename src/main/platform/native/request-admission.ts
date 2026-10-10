import { NativeTransportError } from './transport-failure';

export interface NativeChildIdentity {
  readonly pid: number | undefined;
  readonly generation: number;
}
export type NativePreparation = (child: NativeChildIdentity) => void;

export interface PendingRequest {
  id: string;
  frame: string;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
  parse: (value: unknown) => unknown;
  expiresAt: number;
  beforeSend: NativePreparation | undefined;
}

/** Main-only synchronous admission at the live process write boundary. */
export function admitRequest(pending: PendingRequest, child: NativeChildIdentity): boolean {
  try {
    pending.beforeSend?.(child);
    if (performance.now() >= pending.expiresAt) throw new NativeTransportError('timedOut');

    return true;
  } catch (error) {
    clearTimeout(pending.timer);
    pending.reject(error);
    return false;
  }
}
