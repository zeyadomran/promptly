interface QuitEvent {
  preventDefault: () => void;
}

interface QuitCoordinatorOptions {
  cleanup: () => Promise<void>;
  quit: () => void;
  onError: (error: unknown) => void;
}

export function createQuitCoordinator(options: QuitCoordinatorOptions): (event: QuitEvent) => void {
  let shutdownStarted = false;
  let safeToExit = false;

  async function shutdown(): Promise<void> {
    try {
      await options.cleanup();
    } catch (error) {
      options.onError(error);
    } finally {
      safeToExit = true;
      options.quit();
    }
  }

  return (event) => {
    if (safeToExit) return;
    event.preventDefault();
    if (shutdownStarted) return;
    shutdownStarted = true;
    void shutdown();
  };
}
