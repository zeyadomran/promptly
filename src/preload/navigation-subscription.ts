import type { NativeShellView } from '../shared/contracts/window';
import { shellNavigationSchema } from '../shared/contracts/window';

export function navigationSubscription(
  listen: ((listener: (value: unknown) => void) => () => void) | undefined,
  stops: Set<() => void>,
  disposed: () => boolean
) {
  return (listener: (view: NativeShellView) => void) => {
    if (disposed() || listen === undefined) return () => undefined;
    const stop = listen((value) => {
      const parsed = shellNavigationSchema.safeParse(value);

      if (parsed.success) listener(parsed.data);
    });
    const unsubscribe = () => {
      stop();
      stops.delete(unsubscribe);
    };

    stops.add(unsubscribe);
    return unsubscribe;
  };
}
