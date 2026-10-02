interface QuitEvent {
  preventDefault(): void;
}

/** Repeated quit requests stay prevented until the one cleanup attempt completes. */
export function createQuitGuard(
  cleanup: () => Promise<void>,
  requestQuit: () => void,
  failed: () => void
): (event: QuitEvent) => void {
  let started = false;
  let complete = false;

  return (event) => {
    if (complete) return;
    event.preventDefault();
    if (started) return;
    started = true;
    void Promise.resolve()
      .then(cleanup)
      .then(() => {
        complete = true;
        requestQuit();
      }, failed);
  };
}
