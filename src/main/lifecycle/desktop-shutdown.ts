import { createQuitCoordinator } from './quit-coordinator';

interface ShutdownOptions {
  cleanup: () => Promise<void>;
  quit: () => void;
  exit: (code: number) => void;
  onError: (error: unknown) => void;
  deadlineMs?: number;
}

/** Normal and fatal exits share exactly one bounded resource cleanup. */
export function createDesktopShutdown(options: ShutdownOptions) {
  let fatal = false;
  let finished = false;
  const beforeQuit = createQuitCoordinator({
    cleanup: async () => {
      let timer: ReturnType<typeof setTimeout> | undefined;

      try {
        await Promise.race([
          Promise.resolve().then(options.cleanup),
          new Promise<never>((_, reject) => {
            // Storage may drain accepted 30s writes and a 5s close request.
            timer = setTimeout(() => {
              reject(new Error('Desktop cleanup timed out.'));
            }, options.deadlineMs ?? 40_000);
          })
        ]);
      } finally {
        clearTimeout(timer);
      }
    },
    onError: options.onError,
    quit: () => {
      finished = true;
      if (fatal) options.exit(1);
      else options.quit();
    }
  });

  return {
    beforeQuit,
    fatal: () => {
      if (fatal) return;
      fatal = true;
      if (finished) options.exit(1);
      else beforeQuit({ preventDefault: () => undefined });
    }
  };
}
