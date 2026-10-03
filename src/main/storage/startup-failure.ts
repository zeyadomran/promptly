export const storageStartupCauses = {
  preferences: 'Stored preferences are invalid. Restore the database from backup.',
  newer:
    'This database was created by a newer Promptly version. Install that version or a newer release.',
  damaged: 'The local database is damaged or is not a SQLite database. Restore it from backup.',
  unavailable:
    'The local database cannot be opened. Check data-folder access, free disk space and whether another application is using it.',
  unknown: 'Unable to open local storage. Check data-folder access or restore a known-good backup.'
} as const;

export type StorageStartupCause = keyof typeof storageStartupCauses;

/** Only fixed known causes may cross the worker/startup recovery boundary. */
export class StorageStartupError extends Error {
  constructor(readonly reason: StorageStartupCause) {
    super(storageStartupCauses[reason]);
  }
}

export function classifyStorageStartup(error: unknown): StorageStartupCause {
  if (error instanceof StorageStartupError) return error.reason;
  if (error instanceof Error && 'errcode' in error && typeof error.errcode === 'number') {
    const code = error.errcode % 256;

    if (code === 11 || code === 26) return 'damaged';
    if ([3, 5, 6, 8, 10, 13, 14, 23].includes(code)) return 'unavailable';
  }

  return 'unknown';
}

export function readStorageStartupCause(value: unknown): StorageStartupCause {
  return typeof value === 'string' && Object.hasOwn(storageStartupCauses, value)
    ? (value as StorageStartupCause)
    : 'unknown';
}
