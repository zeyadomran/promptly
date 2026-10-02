// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from 'vitest';

test.skipIf(process.platform !== 'darwin')(
  'native scalar observation transitions distinguish entry/decode/mismatch and stay bounded',
  () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'promptly-carbon-transitions-'));
    const executable = path.join(directory, 'observations');

    try {
      execFileSync(
        'xcrun',
        [
          'swiftc',
          '-swift-version',
          '6',
          '-warnings-as-errors',
          '-parse-as-library',
          path.resolve('tests/native/keyboard/macos/CarbonObservations.swift'),
          path.resolve('tests/native/keyboard/macos/CarbonObservationTests.swift'),
          '-o',
          executable
        ],
        { timeout: 10_000 }
      );
      expect(execFileSync(executable, [], { encoding: 'utf8', timeout: 1000 })).toBe(
        'Owned Carbon observation transitions passed\n'
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  15_000
);
