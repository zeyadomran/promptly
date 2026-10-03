import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { build } from 'vite';
import { expect, it } from 'vitest';

import { createFailureRecovery, type RecoveryNotice } from '../lifecycle/failure-recovery';
import { StorageClient } from './client';
import { StorageEngine } from './engine';

it('rejects damaged and newer databases with safe startup guidance and retains owned data', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'promptly-startup-failure-'));

  try {
    await build({
      configFile: false,
      logLevel: 'silent',
      build: {
        outDir: directory,
        emptyOutDir: false,
        lib: {
          entry: 'src/main/storage/storage-worker.ts',
          formats: ['cjs'],
          fileName: () => 'worker.cjs'
        },
        rollupOptions: { external: [/^node:/] }
      }
    });
    for (const [name, cause] of [
      ['preferences', 'Stored preferences are invalid. Restore the database from backup.'],
      ['local-null', 'Stored preferences are invalid. Restore the database from backup.'],
      ['local-invalid', 'Stored preferences are invalid. Restore the database from backup.'],
      ['local-extra', 'Stored preferences are invalid. Restore the database from backup.'],
      [
        'newer',
        'This database was created by a newer Promptly version. Install that version or a newer release.'
      ],
      [
        'damaged',
        'The local database is damaged or is not a SQLite database. Restore it from backup.'
      ]
    ] as const) {
      const filename = path.join(directory, `${name}.sqlite`);

      if (name === 'damaged') await writeFile(filename, 'private snippet text: not a database');
      else {
        const engine = new StorageEngine(filename);

        engine.run(1, 'createSnippet', { text: 'Retained owned snippet' });
        engine.close();
        const database = new DatabaseSync(filename);

        if (name === 'preferences')
          database
            .prepare('UPDATE settings SET value = ? WHERE key = ?')
            .run('private malformed preference value', 'theme');
        else if (name.startsWith('local-')) {
          const values = {
            'local-null': null,
            'local-invalid': { copy: 7 },
            'local-extra': { copy: 'Return', unknownCommand: 'Escape' }
          };

          database
            .prepare('UPDATE settings SET value = ? WHERE key = ?')
            .run(JSON.stringify(values[name as keyof typeof values]), 'localShortcuts');
        } else database.exec('PRAGMA user_version = 999');
        database.close();
      }

      const original = await readFile(filename);
      const client = new StorageClient(path.join(directory, 'worker.cjs'), filename);
      let notice: RecoveryNotice | undefined;
      let exited = false;
      const recovery = createFailureRecovery({
        directory: () => directory,
        stopCommands: () => undefined,
        show: (value) => {
          notice = value;
          return Promise.resolve('quit');
        },
        fallback: () => undefined,
        relaunch: () => {
          throw new Error('Quit must not relaunch.');
        },
        fatal: () => {
          exited = true;
        }
      });

      try {
        await expect(client.ready).rejects.toThrow(cause);
        await expect(client.call('getSettings', {})).rejects.toThrow(cause);
        await client.ready.catch((error: unknown) => recovery.startup(error));
        expect(notice?.message).toBe('Promptly could not start. Restart or quit Promptly.');
        expect(notice?.detail).toContain(cause);
        expect(notice?.detail).toContain(directory);
        expect(notice?.detail).not.toContain('private');
        expect(exited).toBe(true);
      } finally {
        await client.close().catch(() => undefined);
      }

      expect(await readFile(filename)).toEqual(original);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);
