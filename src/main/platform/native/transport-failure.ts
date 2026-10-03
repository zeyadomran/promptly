export type TransportFailure = 'timedOut' | 'helperUnavailable' | 'busy' | 'disposed';

export class NativeTransportError extends Error {
  constructor(readonly status: TransportFailure) {
    super(status);
  }
}
