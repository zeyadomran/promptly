import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { inspectModule } from './architecture/inspect-module.mjs';

const root = process.cwd();
const ignored = new Set(['node_modules', '.git', '.vite', 'out', 'docs', 'test-results']);

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const filename = path.join(directory, entry.name);

      if (entry.isDirectory()) return ignored.has(entry.name) ? [] : collect(filename);
      return /\.[cm]?[jt]sx?$/.test(entry.name) ? [filename] : [];
    })
  );

  return files.flat();
}

const files = await collect(root);
const results = await Promise.all(
  files.map(async (filename) => {
    const relative = path.relative(root, filename).replaceAll('\\', '/');

    if (relative.startsWith('src/') && !/\.tsx?$/.test(filename)) {
      return [
        `${relative}: Application JavaScript must use TypeScript so every module is checked.`
      ];
    }

    return inspectModule(filename, await readFile(filename, 'utf8'), root);
  })
);
const errors = results.flat();

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Architecture checks passed (${files.length} handwritten modules).`);
}
