import { type UpdateState, updateStateSchema } from '../shared/contracts/updates';

export function updateSubscription(
  listen: ((listener: (value: unknown) => void) => () => void) | undefined,
  stops: Set<() => void>,
  disposed: () => boolean
) {
  return (listener: (state: UpdateState) => void): (() => void) => {
    if (disposed() || listen === undefined) return () => undefined;
    const stop = listen((value) => {
      const parsed = updateStateSchema.safeParse(value);

      if (!disposed() && parsed.success) listener(parsed.data);
    });

    stops.add(stop);
    return () => {
      stop();
      stops.delete(stop);
    };
  };
}
