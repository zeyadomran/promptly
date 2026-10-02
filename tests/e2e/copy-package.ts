import { cp } from 'node:fs/promises';

/** Preserve Electron.framework's relative symlink topology inside an owned package copy. */
export function copyOwnedPackage(source: string, destination: string): Promise<void> {
  return cp(source, destination, { recursive: true, verbatimSymlinks: true });
}
