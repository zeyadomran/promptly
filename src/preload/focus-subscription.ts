export function focusSubscription(
  listen: ((listener: () => void) => () => void) | undefined,
  stops: Set<() => void>,
  disposed: () => boolean
) {
  return (listener: () => void) => {
    if (disposed() || listen === undefined) return () => undefined;
    const stop = listen(listener);
    const unsubscribe = () => {
      stop();
      stops.delete(unsubscribe);
    };

    stops.add(unsubscribe);
    return unsubscribe;
  };
}
