import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** Control only the external filesystem cleanup boundary; SQLite remains real. */
export function denyImportCleanup(): () => void {
  const remove = fs.rmSync;
  const retained = new Set<string>();
  const temporary = path.resolve(tmpdir());

  fs.rmSync = (filename, options) => {
    if (
      typeof filename === 'string' &&
      path.dirname(path.resolve(filename)) === temporary &&
      path.basename(filename).startsWith('promptly-import-')
    ) {
      retained.add(filename);
      throw Object.assign(new Error('Controlled cleanup permission failure'), { code: 'EACCES' });
    }

    remove(filename, options);
  };

  syncBuiltinESMExports();
  return () => {
    fs.rmSync = remove;
    syncBuiltinESMExports();
    for (const directory of retained) remove(directory, { recursive: true, force: true });
  };
}
