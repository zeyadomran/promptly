import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { expect, test } from '@playwright/test';

import { createWindowsSelection } from '../../src/main/platform/windows/windows-selection';
import { windowsFixture } from './windows-fixture';

test.describe('actual Windows executable provenance', () => {
  test.skip(process.platform !== 'win32', 'Windows process image identity is platform-specific');
  test.beforeAll(async () => {
    await promisify(execFile)(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        path.resolve('tests/native/windows/build.ps1')
      ],
      { windowsHide: true }
    );
  });

  for (const basename of ['fixture.exe', 'fixture.com', 'fixture-no-suffix']) {
    test(`retains the actual ${basename} image basename and exact selection`, async () => {
      const adapter = createWindowsSelection({
        resourcesPath: path.resolve('out', `Promptly-win32-${process.arch}`, 'resources'),
        packaged: true,
        applicationPath: 'unused'
      });

      try {
        await adapter.ready();
        const fixture = await windowsFixture('selected', [], basename);

        try {
          const identity = await adapter.foregroundIdentity();

          expect(identity?.source).toMatchObject({ pid: fixture.fixturePid, id: basename });
          if (identity === null) throw new Error('Missing owned fixture identity');
          const result = await adapter.captureSelection(identity);

          expect(result.status).toBe('ok');
          if (result.status === 'ok') {
            expect(result.source?.id).toBe(basename);
            expect(result.text).toBe('  Promptly 雪🙂\r\n"fixture"\tend  ');
          }
        } finally {
          await fixture.close();
        }
      } finally {
        await adapter.dispose();
      }
    });
  }
});
