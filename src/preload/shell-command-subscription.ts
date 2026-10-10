import type { ShellCommand } from '../shared/contracts/window';
import { shellCommandSchema } from '../shared/contracts/window';

export function shellCommandSubscription(
  listen: ((listener: (value: unknown) => void) => () => void) | undefined,
  stops: Set<() => void>,
  disposed: () => boolean
) {
  return (listener: (command: ShellCommand) => void) => {
    if (disposed() || listen === undefined) return () => undefined;
    const stop = listen((value) => {
      const parsed = shellCommandSchema.safeParse(value);

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
