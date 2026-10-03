import { StorageStartupError } from '../storage/startup-failure';

export interface RecoveryNotice {
  title: string;
  message: string;
  detail: string;
}

interface RecoveryOptions {
  directory: () => string;
  stopCommands: () => void;
  show: (notice: RecoveryNotice) => Promise<'restart' | 'quit'>;
  fallback: (notice: RecoveryNotice) => void;
  relaunch: () => void;
  fatal: () => void;
}

/** Fatal recovery owns one visible decision; accepted writes are never replayed. */
export function createFailureRecovery(options: RecoveryOptions) {
  let pending: Promise<void> | undefined;
  let closed = false;
  const warnings = new AbortController();

  async function decide(notice: RecoveryNotice): Promise<void> {
    try {
      const choice = await options.show(notice);

      if (!closed && choice === 'restart') options.relaunch();
    } catch {
      if (!closed) {
        try {
          options.fallback(notice);
        } catch {
          console.error('Unable to display Promptly recovery.');
        }
      }
    } finally {
      if (!closed) options.fatal();
    }
  }

  function recover(message: string, guidance: string): Promise<void> {
    if (closed) return Promise.resolve();
    if (pending !== undefined) return pending;
    warnings.abort();
    options.stopCommands();
    pending = decide({
      title: 'Promptly recovery',
      message,
      detail: `${guidance}\n\nData folder: ${options.directory()}\nBefore restoring a backup, quit Promptly and copy the entire data folder, including promptly.sqlite and any WAL/SHM files. Keep the current files until recovery is verified.`
    });
    return pending;
  }

  return {
    warningSignal: warnings.signal,
    isActive(): boolean {
      return closed || pending !== undefined;
    },
    storage: () =>
      recover(
        'Local storage stopped. Restart or quit Promptly.',
        'The last operation may already be saved. It will not be retried. Restart to reopen the saved database, then review your library and preferences before repeating any change.'
      ),
    startup: (error: unknown) =>
      recover(
        'Promptly could not start. Restart or quit Promptly.',
        error instanceof StorageStartupError
          ? error.message
          : 'Desktop initialization failed. Check data-folder access and available disk space. If the problem continues, retain the data folder for recovery.'
      ),
    close: () => {
      closed = true;
      warnings.abort();
    }
  };
}
