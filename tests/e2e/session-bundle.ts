import { cp } from 'node:fs/promises';

/** Preserve relative macOS framework links so resources resolve inside the owned copy. */
export async function copySessionBundle(source: string, destination: string): Promise<void> {
  await cp(source, destination, { recursive: true, verbatimSymlinks: true });
}
