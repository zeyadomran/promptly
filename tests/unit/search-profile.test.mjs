// @vitest-environment node
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { _electron as electron } from '@playwright/test';
import { afterEach, expect, it, vi } from 'vitest';

import { launchSearchFixture } from '../e2e/search-application';

vi.mock('@playwright/test', () => ({ _electron: { launch: vi.fn() } }));
vi.mock('../e2e/build-ipc-fixture', () => ({ buildIpcFixture: vi.fn() }));
vi.mock('../e2e/search-corpus', () => ({ seedSearchCorpus: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

for (const trace of ['0', '1']) {
  it(`owns and canonically verifies the actual Electron profile with trace=${trace}`, async () => {
    vi.stubEnv('PROMPTLY_SEARCH_TRACE', trace);
    const temporary = await mkdtemp(path.join(tmpdir(), 'promptly-profile-regression-'));
    const info = { outputPath: (name) => path.join(temporary, name) };

    vi.mocked(electron.launch).mockImplementation(async (options) => {
      const argument = options.args.find((value) => value.startsWith('--user-data-dir='));

      expect(argument).toBeDefined();
      const profile = argument.slice('--user-data-dir='.length);

      await mkdir(profile);
      return { evaluate: vi.fn().mockResolvedValue(profile), process: () => ({}), close: vi.fn() };
    });
    let fixture;

    try {
      fixture = await launchSearchFixture(info);
      expect(fixture.profileIdentity.actualCanonical).toBe(
        fixture.profileIdentity.expectedCanonical
      );
      expect(fixture.application.evaluate).toHaveBeenCalledOnce();
    } finally {
      if (fixture !== undefined) await rm(fixture.directory, { recursive: true, force: true });
      await rm(temporary, { recursive: true, force: true });
    }
  });

  it(`rejects a different existing actual directory without deleting it with trace=${trace}`, async () => {
    vi.stubEnv('PROMPTLY_SEARCH_TRACE', trace);
    const different = await mkdtemp(path.join(tmpdir(), 'promptly-wrong-profile-regression-'));
    const close = vi.fn().mockResolvedValue(undefined);

    vi.mocked(electron.launch).mockImplementation(async (options) => {
      const profile = options.args
        .find((value) => value.startsWith('--user-data-dir='))
        .slice('--user-data-dir='.length);

      await mkdir(profile);
      return {
        evaluate: vi.fn().mockResolvedValueOnce(different).mockResolvedValue(undefined),
        process: () => ({}),
        close
      };
    });
    try {
      await expect(
        launchSearchFixture({ outputPath: (name) => path.join(different, name) })
      ).rejects.toThrow('Packaged test profile was not isolated:');
      expect(close).toHaveBeenCalledOnce();
      expect((await stat(different)).isDirectory()).toBe(true);
    } finally {
      await rm(different, { recursive: true, force: true });
    }
  });
}
